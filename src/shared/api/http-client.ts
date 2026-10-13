/**
 * [MODÜL: HTTP İSTEMCİSİ]
 * Amaç: Youthside API ile tüm iletişimin geçtiği tek kapı.
 *
 * Sorumlulukları (yalnızca taşıma katmanı):
 *   - Base URL + query string üretimi
 *   - `Authorization: Bearer` başlığı (token varsa)
 *   - Zaman aşımı
 *   - Yanıt zarfını açıp `data`'yı döndürmek, hatayı `ApiError`'a çevirmek
 *
 * Bilmedikleri: Hangi uç noktanın ne döndürdüğü (repository'ler), token'ın nereden
 * geldiği (middleware enjekte eder), oturum yenileme (auth servisi). → SRP + DIP
 *
 * Hem sunucuda (SSR/Actions) hem tarayıcıda çalışır; yalnızca `fetch` kullanır.
 */

import { ApiError, GENERIC_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE } from './errors';
import { isRecord } from './parse';

/** Query değeri. Dizi verilirse `key[]=a&key[]=b` biçiminde gönderilir. */
export type QueryValue = string | number | boolean | null | undefined | readonly string[];
export type QueryParams = Record<string, QueryValue>;

export interface HttpClientOptions {
  readonly baseUrl: string;
  /** İstek anında güncel access token'ı verir (yoksa null). */
  readonly getAccessToken?: () => string | null;
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/** Boş değerleri atlayarak URLSearchParams üretir. */
export function buildQuery(params: QueryParams = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) if (item) search.append(`${key}[]`, item);
    } else {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly getAccessToken: () => string | null;
  private readonly timeoutMs: number;

  constructor({ baseUrl, getAccessToken = () => null, timeoutMs = DEFAULT_TIMEOUT_MS }: HttpClientOptions) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.getAccessToken = getAccessToken;
    this.timeoutMs = timeoutMs;
  }

  get<T>(path: string, query?: QueryParams): Promise<T> {
    return this.request<T>('GET', `${path}${buildQuery(query)}`);
  }

  post<T>(path: string, body?: unknown, query?: QueryParams): Promise<T> {
    return this.request<T>('POST', `${path}${buildQuery(query)}`, body === undefined ? undefined : JSON.stringify(body));
  }

  /** Dosya yükleme (multipart/form-data). Content-Type tarayıcı/undici tarafından sınırla birlikte atanır. */
  postForm<T>(path: string, form: FormData): Promise<T> {
    return this.request<T>('POST', path, form);
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: string | FormData): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (typeof body === 'string') headers['Content-Type'] = 'application/json';

    const token = this.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/${path.replace(/^\/+/, '')}`, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      // Ağ hatası veya zaman aşımı — kullanıcıya teknik detay gösterilmez.
      throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
    }

    const payload = await this.parseJson(response);

    if (!response.ok || payload.status === 'error') {
      const message = typeof payload.message === 'string' && payload.message ? payload.message : GENERIC_ERROR_MESSAGE;
      throw new ApiError(message, response.status || 500, payload);
    }

    return payload.data as T;
  }

  /** HTML hata sayfası veya boş gövde gelirse anlamlı bir nesneye düşer. */
  private async parseJson(response: Response): Promise<Record<string, unknown>> {
    try {
      const json: unknown = await response.json();
      return isRecord(json) ? json : { data: json };
    } catch {
      return { status: response.ok ? 'success' : 'error', message: response.ok ? '' : GENERIC_ERROR_MESSAGE };
    }
  }
}
