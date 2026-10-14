/**
 * @file Paylaşım API'sinin tel (wire) sözleşmesi: share backend'i ve ATS yükleme ucuyla konuşulan veri tipleri.
 * Backend karşılığı: backend/src/Shares/*. Alan adları birebir aynıdır.
 */

/** `GET /me`: doğrulanmış SSO token'ındaki kullanıcı. */
export interface CurrentUser {
  readonly sub: string;
  readonly email: string;
  readonly name: string;
  readonly picture: string | null;
}

/** Sunucu tarafı sınırlar. Tek kaynak backend'dir; arayüz aynı kontrolü yükleme başlamadan yapar. */
export interface ShareLimits {
  readonly maxFiles: number;
  readonly maxFileBytes: number;
  readonly maxTotalBytes: number;
  readonly allowedMimeTypes: readonly string[];
}

/** Transfer başında bildirilen, yüklenmesi beklenen dosya. */
export interface ManifestEntry {
  readonly relativePath: string;
  readonly size: number;
  /** File.lastModified (ms). Kaldığı yerden devam ederken dosyayı eşlemek için. */
  readonly lastModified: number | null;
}

/** `POST /shares` yanıtı: taslak paylaşım. */
export interface ShareDraft {
  readonly id: number;
  /** ATS yükleme ucunun `directory` alanı (ör. `share/3f9c…`). Tahmin edilemez. */
  readonly uploadDirectory: string;
  readonly limits: ShareLimits;
}

export type RemoteFileStatus = 'pending' | 'done';

export interface RemoteFileState extends ManifestEntry {
  readonly status: RemoteFileStatus;
}

/** `GET /shares/{id}`: devam etmek için taslağın durumu. */
export interface ShareProgressSnapshot extends ShareDraft {
  readonly status: 'draft' | 'ready';
  readonly createdAt: string;
  readonly files: readonly RemoteFileState[];
}

/** `GET /shares?status=draft`: yarım kalan transfer özeti. */
export interface DraftSummary {
  readonly id: number;
  readonly createdAt: string;
  readonly fileCount: number;
  readonly totalSize: number;
  readonly uploadedCount: number;
  readonly uploadedSize: number;
}

/** CDN'e yüklenmiş ve `POST /shares/{id}/files` ile kaydedilen dosya. */
export interface UploadedFileRecord {
  readonly relativePath: string;
  readonly size: number;
  readonly mimeType: string;
  /** ATS yanıtındaki şemasız `file_path`. */
  readonly filePath: string;
}

export interface RegisterFilesResult {
  readonly uploadedCount: number;
  readonly pendingCount: number;
}

/**
 * Link oluşturma girdisi. Nesne olarak tutulur: alıcı e-postası, mesaj ve son kullanma süresi
 * ileride buraya opsiyonel alan olarak eklenecek (şimdilik kapsam dışı).
 */
export interface CreateShareInput {
  readonly shareId: number;
}

/** `POST /shares/{id}/finalize` yanıtı. */
export interface ShareLink {
  readonly token: string;
  readonly publicUrl: string;
  readonly fileCount: number;
  readonly totalSize: number;
}

export interface PublicShareFile {
  readonly id: number;
  readonly relativePath: string;
  readonly size: number;
  readonly mimeType: string;
  readonly downloadUrl: string;
}

/** `GET /public/shares/{token}`: herkese açık içerik. Yükleyenin kişisel bilgisi bulunmaz. */
export interface PublicShare {
  readonly token: string;
  readonly createdAt: string | null;
  readonly expiresAt: string | null;
  readonly fileCount: number;
  readonly totalSize: number;
  readonly files: readonly PublicShareFile[];
}

/** Ağ isteklerinin ortak seçenekleri. */
export interface RequestControl {
  readonly signal?: AbortSignal;
}
