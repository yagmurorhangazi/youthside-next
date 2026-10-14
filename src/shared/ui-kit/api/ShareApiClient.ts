/**
 * @file Paylaşım ağ erişiminin soyutlaması. Bileşenler ve hook'lar yalnızca bu arayüze bağlıdır;
 * somut sınıf (HTTP ya da mock) ShareClientsProvider üzerinden enjekte edilir.
 */

import type {
  CreateShareInput,
  DraftSummary,
  ManifestEntry,
  PublicShare,
  RegisterFilesResult,
  RequestControl,
  ShareDraft,
  ShareLink,
  ShareProgressSnapshot,
  UploadedFileRecord,
} from './types';
import type { UploadFileInput, UploadFilesOptions, UploadFilesResult } from './uploadQueue';

export interface ShareApiClient {
  /** Taslak paylaşım açar ve beklenen dosya listesini sunucuya bildirir. */
  prepareShare(manifest: readonly ManifestEntry[], control?: RequestControl): Promise<ShareDraft>;
  /** Taslağın durumu: hangi dosyalar yüklendi (kaldığı yerden devam için). */
  getShareProgress(shareId: number, control?: RequestControl): Promise<ShareProgressSnapshot>;
  /** Kullanıcının yarım kalan transferleri. */
  listDrafts(control?: RequestControl): Promise<DraftSummary[]>;
  /**
   * Dosyaları CDN'e yükler. `onProgress` yüklenen bayt, toplam bayt ve dosya bazında bilgi verir;
   * `signal` ile gerçekten iptal edilir.
   */
  uploadFiles(directory: string, files: readonly UploadFileInput[], options: UploadFilesOptions): Promise<UploadFilesResult>;
  /** Yüklenmiş dosyaları kaydeder (tekrar çağrılması güvenlidir). */
  registerFiles(shareId: number, files: readonly UploadedFileRecord[], control?: RequestControl): Promise<RegisterFilesResult>;
  /** Herkese açık linki oluşturur. */
  createShare(input: CreateShareInput, control?: RequestControl): Promise<ShareLink>;
  deleteShare(shareId: number, control?: RequestControl): Promise<void>;
  /** Herkese açık içerik. Token gönderilmez. */
  getPublicShare(token: string, control?: RequestControl): Promise<PublicShare>;
}
