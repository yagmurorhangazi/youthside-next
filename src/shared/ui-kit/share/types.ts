/**
 * @file Paylaşım arayüzünün durum tipleri. Tel sözleşmesi (API) için bkz. api/types.ts.
 */

import type { ShareLink } from '../api/types';
import type { FileRejectionReason } from '../utils/uploadRules';

/** Seçime eklenmiş, kurallara uyan dosya. `id` göreli yoldur (seçimde benzersiz). */
export interface SelectedFile {
  readonly id: string;
  readonly file: File;
  readonly relativePath: string;
  readonly size: number;
  readonly mimeType: string;
  readonly lastModified: number;
}

/** Kurallara uymadığı için seçime alınmayan dosya. */
export interface RejectedFile {
  readonly relativePath: string;
  readonly reason: FileRejectionReason;
  readonly message: string;
}

export type FileUploadStatus = 'queued' | 'uploading' | 'done' | 'error';

/** Dosya listesinde gösterilen, hazır hesaplanmış durum. */
export interface FileUploadState {
  readonly id: string;
  readonly status: FileUploadStatus;
  readonly loaded: number;
  readonly size: number;
  /** 0–100 */
  readonly percent: number;
  readonly errorMessage?: string;
}

/**
 * Yükleme akışının evreleri:
 * idle → preparing → uploading ⇄ waitingForNetwork → finalizing ("Link oluşturuluyor") → success | error | cancelled
 */
export type UploadPhase =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'waitingForNetwork'
  | 'finalizing'
  | 'success'
  | 'error'
  | 'cancelled';

export interface UploadErrorState {
  readonly message: string;
  readonly code?: string;
  readonly unauthorized: boolean;
  /** Aynı transfer kaldığı yerden yeniden denenebilir mi (taslak sunucuda duruyor). */
  readonly canRetry: boolean;
  /** Yüklenemeyen dosyaların kimlikleri (dosya bazında hata varsa). */
  readonly failedIds?: readonly string[];
}

export interface UploadState {
  readonly phase: UploadPhase;
  /** 0–100, bayt bazlı, geri gitmez. */
  readonly percent: number;
  readonly uploadedBytes: number;
  readonly totalBytes: number;
  readonly files: Readonly<Record<string, FileUploadState>>;
  readonly shareId: number | null;
  readonly link: ShareLink | null;
  readonly error: UploadErrorState | null;
}

/** Yükleme sürüyor mu (dosya ekleme/kaldırma kilitli). */
export function isUploadBusy(phase: UploadPhase): boolean {
  return phase === 'preparing' || phase === 'uploading' || phase === 'waitingForNetwork' || phase === 'finalizing';
}
