/**
 * @file Tek bir dosyanın CDN'e nasıl gittiği. Uygulamanın geri kalanı yalnızca `UploadTransport`'a bağlıdır.
 *
 * Şu an: `createSingleRequestTransport`, ATS `POST /admin/storage/apps/upload` ucuna tek multipart istek
 * (docs/admin-api.md). Dosya baytları share sunucusundan geçmez.
 * İleride bayt düzeyinde devam (parçalı yükleme) gelirse yalnızca yeni bir transport eklenir.
 */

import type { HttpClient } from './http';

export interface TransportUploadOptions {
  readonly signal: AbortSignal;
  /** Bu dosyanın gönderilen baytı (0…file.size). */
  readonly onProgress: (loaded: number) => void;
}

export interface TransportUploadResult {
  /** Şemasız kanonik CDN yolu (veritabanına yazılan). */
  readonly filePath: string;
  readonly cdnUrl: string;
}

export interface UploadTransport {
  upload(file: Blob, directory: string, options: TransportUploadOptions): Promise<TransportUploadResult>;
}

interface AtsUploadResponse {
  readonly cdn_url: string;
  readonly file_path: string;
  readonly file_name: string;
}

export const ATS_APPS_UPLOAD_PATH = '/admin/storage/apps/upload';

export function createSingleRequestTransport(http: HttpClient, path: string = ATS_APPS_UPLOAD_PATH): UploadTransport {
  return {
    async upload(file, directory, { signal, onProgress }) {
      const formData = new FormData();
      formData.append('directory', directory);
      formData.append('file', file);

      const response = await http.upload<AtsUploadResponse>(path, {
        formData,
        signal,
        // XHR toplamı multipart başlıklarını da içerir; dosyanın kendi baytına oranlanır
        onProgress: (loaded, total) => onProgress(total > 0 ? Math.min(file.size, Math.round((loaded / total) * file.size)) : 0),
      });
      onProgress(file.size);
      return { filePath: response.file_path, cdnUrl: response.cdn_url };
    },
  };
}
