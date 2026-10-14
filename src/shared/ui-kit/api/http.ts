/**
 * @file Tek HTTP istemcisi. Authorization başlığı YALNIZCA burada eklenir; hem JSON istekleri (fetch)
 * hem dosya yükleme (XMLHttpRequest, ilerleme için) aynı yoldan geçer.
 *
 * Kurallar:
 *  - Token host projeden `getAccessToken` ile her istekte taze alınır; saklanmaz, loglanmaz, URL'ye konmaz.
 *  - `auth: false` istekleri (herkese açık uçlar) token'sız gider.
 *  - 401 gelirse `onUnauthorized` çağrılır (host giriş akışını başlatır), hata yukarı fırlatılır.
 *  - Youthside zarfı ({ status, code, message, data }) burada açılır; üst katman yalnızca `data` görür.
 */

import { ApiError, abortError } from './errors';

export type AccessTokenProvider = () => Promise<string | null | undefined> | string | null | undefined;

export interface HttpClientConfig {
  readonly baseUrl: string;
  readonly getAccessToken?: AccessTokenProvider;
  readonly onUnauthorized?: () => void;
  /** Testler için. Varsayılan: global fetch / XMLHttpRequest. */
  readonly fetchImpl?: typeof fetch;
  readonly createXhr?: () => XMLHttpRequest;
}

export interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly body?: unknown;
  readonly query?: Readonly<Record<string, string>>;
  /** false: token gönderilmez (herkese açık uç). Varsayılan true. */
  readonly auth?: boolean;
  readonly signal?: AbortSignal;
}

export interface UploadRequestOptions {
  readonly formData: FormData;
  readonly auth?: boolean;
  readonly signal?: AbortSignal;
  /** Gönderilen bayt / isteğin toplam baytı (multipart başlıkları dahil). */
  readonly onProgress?: (loaded: number, total: number) => void;
}

export interface HttpClient {
  request<T>(path: string, options?: RequestOptions): Promise<T>;
  upload<T>(path: string, options: UploadRequestOptions): Promise<T>;
}

interface Envelope {
  readonly status?: unknown;
  readonly code?: unknown;
  readonly message?: unknown;
  readonly errorCode?: unknown;
  readonly data?: unknown;
  readonly [key: string]: unknown;
}

const ENVELOPE_KEYS = new Set(['status', 'code', 'message', 'errorCode', 'data', 'timestamp']);

export function createHttpClient(config: HttpClientConfig): HttpClient {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');

  const url = (path: string, query?: Readonly<Record<string, string>>): string => {
    const search = query ? `?${new URLSearchParams(query).toString()}` : '';
    return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}${search}`;
  };

  /** Authorization başlığının eklendiği tek yer. */
  const authHeaders = async (auth: boolean): Promise<Record<string, string>> => {
    if (!auth) return {};
    const token = await config.getAccessToken?.();
    if (!token) {
      config.onUnauthorized?.();
      throw ApiError.unauthorized();
    }
    return { Authorization: `Bearer ${token}` };
  };

  const fail = (error: ApiError): never => {
    if (error.status === 401) config.onUnauthorized?.();
    throw error;
  };

  return {
    async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
      const { method = 'GET', body, query, auth = true, signal } = options;
      const headers: Record<string, string> = { Accept: 'application/json', ...(await authHeaders(auth)) };
      if (body !== undefined) headers['Content-Type'] = 'application/json';

      let response: Response;
      try {
        response = await (config.fetchImpl ?? fetch)(url(path, query), {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal,
          // Herkese açık isteklerde çerez ve referer gönderilmez
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
        });
      } catch (error) {
        if (signal?.aborted) throw abortError();
        throw ApiError.network(error instanceof Error ? error.message : undefined);
      }
      return unwrap<T>(response.status, await response.text(), fail);
    },

    async upload<T>(path: string, options: UploadRequestOptions): Promise<T> {
      const { formData, auth = true, signal, onProgress } = options;
      if (signal?.aborted) throw abortError();
      const headers = await authHeaders(auth);

      return new Promise<T>((resolve, reject) => {
        const xhr = config.createXhr?.() ?? new XMLHttpRequest();
        const onAbort = () => xhr.abort();
        const cleanup = () => signal?.removeEventListener('abort', onAbort);

        xhr.open('POST', url(path));
        xhr.setRequestHeader('Accept', 'application/json');
        for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
        // fetch yükleme ilerlemesi vermez; XHR'ın upload.onprogress olayı bayt bazında verir
        xhr.upload.onprogress = (event) => onProgress?.(event.loaded, event.lengthComputable ? event.total : 0);
        xhr.onload = () => {
          cleanup();
          try {
            resolve(unwrap<T>(xhr.status, xhr.responseText, fail));
          } catch (error) {
            reject(error);
          }
        };
        xhr.onerror = () => {
          cleanup();
          reject(ApiError.network());
        };
        xhr.ontimeout = xhr.onerror;
        xhr.onabort = () => {
          cleanup();
          reject(abortError());
        };
        signal?.addEventListener('abort', onAbort, { once: true });
        xhr.send(formData);
      });
    },
  };
}

function parseEnvelope(text: string): Envelope | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as Envelope;
  } catch {
    // HTML hata sayfası vb.: zarf yok, durum koduna göre hata üretilir
    return null;
  }
}

/** Youthside zarfını açar; hata yanıtını ApiError'a çevirir. */
function unwrap<T>(status: number, text: string, fail: (error: ApiError) => never): T {
  const envelope = parseEnvelope(text);

  if (status >= 200 && status < 300 && envelope?.status !== 'error') {
    return (envelope && 'data' in envelope ? envelope.data : envelope) as T;
  }

  const details: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(envelope ?? {})) if (!ENVELOPE_KEYS.has(key)) details[key] = value;
  const message = typeof envelope?.message === 'string' ? envelope.message : `İstek başarısız (HTTP ${status}).`;
  const code = typeof envelope?.errorCode === 'string' ? envelope.errorCode : undefined;
  return fail(new ApiError(message, status || 500, code, details));
}
