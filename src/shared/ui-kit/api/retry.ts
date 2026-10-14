/**
 * @file Geçici ağ hatalarına dayanıklılık: üstel geri çekilme ve bağlantının geri gelmesini bekleme.
 */

import { abortError } from './errors';

/** Ağ bağlantısı durumu. Testler ve Storybook kendi uygulamasını verir. */
export interface Connectivity {
  isOnline(): boolean;
  /** Bağlantı geri gelince (ya da zaten varsa hemen) çözülür. */
  waitForOnline(signal?: AbortSignal): Promise<void>;
}

export const browserConnectivity: Connectivity = {
  isOnline: () => typeof navigator === 'undefined' || navigator.onLine !== false,
  waitForOnline(signal) {
    if (this.isOnline()) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const done = () => {
        window.removeEventListener('online', done);
        signal?.removeEventListener('abort', aborted);
        resolve();
      };
      const aborted = () => {
        window.removeEventListener('online', done);
        reject(abortError());
      };
      window.addEventListener('online', done);
      signal?.addEventListener('abort', aborted, { once: true });
    });
  },
};

export const RETRY_BASE_MS = 1000;
export const RETRY_MAX_MS = 30_000;

/**
 * n. denemeden önce beklenecek süre: 1, 2, 4, 8… sn, en fazla 30 sn.
 * ±%20 rastgelelik, aynı anda kopan istemcilerin sunucuya aynı anda dönmesini önler.
 */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const exponential = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** Math.max(0, attempt - 1));
  return Math.round(exponential * (0.8 + random() * 0.4));
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', aborted);
      resolve();
    }, ms);
    const aborted = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener('abort', aborted, { once: true });
  });
}
