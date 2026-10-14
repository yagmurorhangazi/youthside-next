/**
 * @file Yükleme ilerlemesinin tek hesap yeri. Hem yükleme kuyruğu (api/uploadQueue.ts) hem useUpload buradan okur.
 * Yüzde dosya adedine göre değil bayt bazında hesaplanır: Σ min(yüklenen, boyut) / Σ boyut.
 */

export interface ByteProgressItem {
  readonly size: number;
  readonly loaded: number;
}

export interface UploadProgressSummary {
  readonly uploadedBytes: number;
  readonly totalBytes: number;
  /** Tam sayı, 0–100. */
  readonly percent: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function sumUploadedBytes(items: Iterable<ByteProgressItem>): { uploadedBytes: number; totalBytes: number } {
  let uploadedBytes = 0;
  let totalBytes = 0;
  for (const item of items) {
    const size = Math.max(0, item.size);
    totalBytes += size;
    uploadedBytes += clamp(Number.isFinite(item.loaded) ? item.loaded : 0, 0, size);
  }
  return { uploadedBytes, totalBytes };
}

/** Tek dosyanın yüzdesi. Boş dosya yüklendiğinde %100 sayılır. */
export function filePercent(loaded: number, size: number, done = false): number {
  if (done) return 100;
  if (size <= 0) return 0;
  return clamp(Math.floor((loaded / size) * 100), 0, 100);
}

/**
 * Genel ilerleme. `previous` verilirse yüzde geri gitmez: yeniden denenen bir dosyanın baytı sıfırlansa da
 * çubuk geriye kaymaz, yeni değer önceki değeri geçince ilerlemeye devam eder.
 * %100 yalnızca bütün baytlar gerçekten gönderildiğinde gösterilir (aşağı yuvarlama).
 * `allDone`: toplamı 0 olan (yalnızca boş dosyalardan oluşan) transfer tamamlandığında %100.
 */
export function computeUploadProgress(
  items: Iterable<ByteProgressItem>,
  previous?: UploadProgressSummary,
  allDone = false,
): UploadProgressSummary {
  const { uploadedBytes, totalBytes } = sumUploadedBytes(items);
  const raw = totalBytes > 0 ? Math.floor((uploadedBytes / totalBytes) * 100) : allDone ? 100 : 0;
  const percent = clamp(Math.max(raw, previous?.percent ?? 0), 0, 100);
  return {
    uploadedBytes: Math.max(uploadedBytes, previous && previous.totalBytes === totalBytes ? previous.uploadedBytes : 0),
    totalBytes,
    percent,
  };
}
