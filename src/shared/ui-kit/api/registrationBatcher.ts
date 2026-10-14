/**
 * @file Biten dosyaların sunucuya toplu kaydı. Her dosya için ayrı istek yerine en fazla `maxBatch` dosya
 * ya da `intervalMs` sürede bir tek istek atılır (1000 küçük dosya ≈ 50 istek).
 * Kayıt sunucuda olduğu için sayfa kapansa bile yüklenmiş dosyalar bir daha gönderilmez.
 * Geçici hatalarda kayıt kaybolmaz: aynı parti geri çekilmeyle yeniden denenir (sunucu tarafı idempotent).
 */

import { isAbortError, isRetryableError } from './errors';
import { backoffDelay, browserConnectivity, sleep, type Connectivity } from './retry';
import type { UploadedFileRecord } from './types';

export interface RegistrationBatcherOptions {
  readonly maxBatch?: number;
  readonly intervalMs?: number;
  readonly maxAttempts?: number;
  readonly signal?: AbortSignal;
  readonly connectivity?: Connectivity;
  readonly random?: () => number;
}

export interface RegistrationBatcher {
  add(record: UploadedFileRecord): void;
  /** Bekleyen her şeyi gönderir; kalıcı bir hata olduysa onu fırlatır. */
  flush(): Promise<void>;
  /** Zamanlayıcıyı durdurur, bekleyen kayıtları bırakır (iptal). */
  dispose(): void;
}

export const DEFAULT_REGISTER_BATCH = 20;
export const DEFAULT_REGISTER_INTERVAL_MS = 2000;

export function createRegistrationBatcher(
  register: (records: UploadedFileRecord[]) => Promise<unknown>,
  options: RegistrationBatcherOptions = {},
): RegistrationBatcher {
  const {
    maxBatch = DEFAULT_REGISTER_BATCH,
    intervalMs = DEFAULT_REGISTER_INTERVAL_MS,
    maxAttempts = 6,
    signal,
    connectivity = browserConnectivity,
    random,
  } = options;

  let buffer: UploadedFileRecord[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let chain: Promise<void> = Promise.resolve();
  let failure: unknown = null;
  let disposed = false;

  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const sendWithRetry = async (batch: UploadedFileRecord[]) => {
    for (let attempt = 1; ; attempt++) {
      try {
        await register(batch);
        return;
      } catch (error) {
        if (disposed || isAbortError(error) || signal?.aborted) throw error;
        if (!isRetryableError(error)) throw error;
        if (!connectivity.isOnline()) {
          await connectivity.waitForOnline(signal);
          attempt = 0;
          continue;
        }
        if (attempt >= maxAttempts) throw error;
        await sleep(backoffDelay(attempt, random), signal);
      }
    }
  };

  const schedule = () => {
    if (timer !== null || buffer.length === 0 || disposed) return;
    timer = setTimeout(() => {
      timer = null;
      void drain(true);
    }, intervalMs);
  };

  /**
   * Tamponu gönderir. `force` değilse yalnızca dolu partiler gider; kalan kısım süre dolunca (ya da flush'ta)
   * gönderilir. Gönderimler sıralıdır: aynı anda tek istek.
   */
  const drain = (force: boolean): Promise<void> => {
    chain = chain
      .then(async () => {
        while (failure === null && !disposed && (buffer.length >= maxBatch || (force && buffer.length > 0))) {
          const batch = buffer.slice(0, maxBatch);
          await sendWithRetry(batch);
          buffer = buffer.slice(batch.length);
        }
        schedule();
      })
      .catch((error: unknown) => {
        failure ??= error;
      });
    return chain;
  };

  return {
    add(record) {
      if (disposed) return;
      buffer.push(record);
      if (buffer.length >= maxBatch) void drain(false);
      else schedule();
    },
    async flush() {
      clearTimer();
      await drain(true);
      if (failure !== null) {
        const error = failure;
        // Bir sonraki flush yeniden deneyebilsin: kalan kayıtlar tamponda durur
        failure = null;
        throw error;
      }
    },
    dispose() {
      disposed = true;
      clearTimer();
      buffer = [];
    },
  };
}
