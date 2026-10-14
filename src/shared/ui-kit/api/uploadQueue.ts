/**
 * @file Çok dosyalı yükleme motoru: sıralama, eşzamanlılık, yeniden deneme ve bağlantı bekleme.
 * Gerçek (HttpShareApiClient) ve mock (MockShareApiClient) istemci aynı motoru kullanır; fark yalnızca transport'tadır.
 *
 * Kayıp işi en aza indirmek için:
 *  - Küçük dosyalar önce: bağlantı koparsa tamamlanmış dosya sayısı en yüksek olur.
 *  - Uyarlanan eşzamanlılık: ağ hatasında 1'e iner, başarılı yüklemelerle yeniden yükselir.
 *  - Çevrimdışıyken deneme harcanmaz: bağlantı gelene kadar beklenir, sonra kaldığı dosyadan devam edilir.
 */

import { abortError, isAbortError, isRetryableError, isUnauthorizedError } from './errors';
import { backoffDelay, browserConnectivity, sleep, type Connectivity } from './retry';
import type { UploadedFileRecord } from './types';
import type { UploadTransport } from './uploadTransport';
import { sumUploadedBytes } from '../utils/uploadProgress';

export interface UploadFileInput {
  /** Seçimdeki benzersiz kimlik (göreli yol). */
  readonly id: string;
  readonly file: Blob;
  readonly relativePath: string;
  readonly size: number;
  readonly mimeType: string;
}

export interface UploadProgressReport {
  /** Olayı tetikleyen dosya. */
  readonly file: { readonly id: string; readonly loaded: number; readonly total: number };
  /** Bu çağrıdaki bütün dosyalar için yüklenen bayt. */
  readonly loadedBytes: number;
  readonly totalBytes: number;
}

export interface UploadFilesOptions {
  readonly signal: AbortSignal;
  /** En fazla eşzamanlı yükleme. Varsayılan 3 (ATS panelindeki uploader ile aynı). */
  readonly concurrency?: number;
  /** Çevrimiçiyken bir dosya için en fazla deneme. Varsayılan 6. */
  readonly maxAttempts?: number;
  readonly connectivity?: Connectivity;
  readonly onProgress?: (report: UploadProgressReport) => void;
  readonly onFileStart?: (id: string) => void;
  readonly onFileUploaded?: (id: string, record: UploadedFileRecord) => void;
  readonly onFileError?: (id: string, error: unknown) => void;
  /** true: bağlantı bekleniyor; false: devam ediliyor. */
  readonly onNetworkStateChange?: (waiting: boolean) => void;
  /** Testler için: geri çekilme süresindeki rastgelelik. */
  readonly random?: () => number;
}

export interface UploadFilesResult {
  readonly uploaded: readonly string[];
  readonly failed: ReadonlyArray<{ readonly id: string; readonly error: unknown }>;
}

export const DEFAULT_UPLOAD_CONCURRENCY = 3;
export const DEFAULT_MAX_ATTEMPTS = 6;
/** Eşzamanlılığı bir kademe artırmak için gereken art arda başarılı yükleme. */
const SUCCESSES_TO_SCALE_UP = 2;

/**
 * Dosyaları yükler. Tek tek başarısız olan dosyalar sonuçta `failed` olarak döner (diğerleri devam eder).
 * İptal ya da oturum düşmesi (401) bütün işi durdurur ve promise reddedilir.
 */
export function runUploadQueue(
  transport: UploadTransport,
  directory: string,
  files: readonly UploadFileInput[],
  options: UploadFilesOptions,
): Promise<UploadFilesResult> {
  const {
    signal,
    concurrency = DEFAULT_UPLOAD_CONCURRENCY,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    connectivity = browserConnectivity,
    random,
  } = options;
  const maxConcurrency = Math.max(1, concurrency);

  if (signal.aborted) return Promise.reject(abortError());

  // Dahili iptal: dışarıdan iptal ya da ölümcül hata (401) bütün aktif yüklemeleri durdurur
  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  signal.addEventListener('abort', forwardAbort, { once: true });

  const queue = [...files].sort((a, b) => a.size - b.size);
  const loaded = new Map<string, number>(files.map((f) => [f.id, 0]));
  const sizes = new Map<string, number>(files.map((f) => [f.id, f.size]));
  const uploaded: string[] = [];
  const failed: Array<{ id: string; error: unknown }> = [];

  let limit = maxConcurrency;
  let successStreak = 0;
  let active = 0;
  let onlineWait: Promise<void> | null = null;

  const report = (file: UploadFileInput, bytes: number) => {
    loaded.set(file.id, bytes);
    const totals = sumUploadedBytes([...loaded].map(([id, l]) => ({ loaded: l, size: sizes.get(id) ?? 0 })));
    options.onProgress?.({ file: { id: file.id, loaded: bytes, total: file.size }, loadedBytes: totals.uploadedBytes, totalBytes: totals.totalBytes });
  };

  /** Bütün işçiler tek bir bekleme paylaşır: bağlantı gelince hepsi birlikte devam eder. */
  const waitForOnline = (): Promise<void> => {
    onlineWait ??= (async () => {
      options.onNetworkStateChange?.(true);
      try {
        await connectivity.waitForOnline(controller.signal);
      } finally {
        onlineWait = null;
        options.onNetworkStateChange?.(false);
      }
    })();
    return onlineWait;
  };

  const uploadOne = async (file: UploadFileInput): Promise<void> => {
    for (let attempt = 1; ; attempt++) {
      if (onlineWait) await onlineWait;
      try {
        options.onFileStart?.(file.id);
        const result = await transport.upload(file.file, directory, {
          signal: controller.signal,
          onProgress: (bytes) => report(file, bytes),
        });
        report(file, file.size);
        uploaded.push(file.id);
        options.onFileUploaded?.(file.id, {
          relativePath: file.relativePath,
          size: file.size,
          mimeType: file.mimeType,
          filePath: result.filePath,
        });
        if (++successStreak >= SUCCESSES_TO_SCALE_UP && limit < maxConcurrency) {
          limit++;
          successStreak = 0;
        }
        return;
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) throw abortError();
        if (isUnauthorizedError(error)) throw error;

        // Yarım kalan dosya baştan gönderilecek: baytı sıfırlanır (genel yüzde useUpload'da geri gitmez)
        report(file, 0);
        if (!isRetryableError(error)) {
          failed.push({ id: file.id, error });
          options.onFileError?.(file.id, error);
          return;
        }

        // Ağ sorunu: eşzamanlılık düşürülür, zayıf bağlantıda yarım kalan dosya sayısı azalır
        limit = 1;
        successStreak = 0;
        if (!connectivity.isOnline()) {
          await waitForOnline();
          attempt = 0; // çevrimdışı geçen süre deneme hakkı yemez
          continue;
        }
        if (attempt >= maxAttempts) {
          failed.push({ id: file.id, error });
          options.onFileError?.(file.id, error);
          return;
        }
        await sleep(backoffDelay(attempt, random), controller.signal);
      }
    }
  };

  return new Promise<UploadFilesResult>((resolve, reject) => {
    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', forwardAbort);
      if (error === undefined) resolve({ uploaded, failed });
      else reject(error);
    };

    const pump = () => {
      if (settled) return;
      while (active < limit && queue.length > 0) {
        const file = queue.shift() as UploadFileInput;
        active++;
        uploadOne(file).then(
          () => {
            active--;
            if (queue.length === 0 && active === 0) finish();
            else pump();
          },
          (error: unknown) => {
            active--;
            controller.abort();
            finish(error);
          },
        );
      }
      if (queue.length === 0 && active === 0) finish();
    };

    pump();
  });
}
