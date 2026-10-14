/**
 * @file Yükleme öncesi istemci kontrolü. Sunucu aynı kontrolü yine yapar; buradaki amaç kullanıcıyı
 * yükleme başlamadan, anlaşılır bir mesajla uyarmaktır.
 * İzinli türler ATS `StorageService::APPS_MIME_TYPES` listesinin aynasıdır (docs/admin-api.md "Dosya kuralları");
 * liste değişirse backend/config.php ile birlikte güncellenir.
 */

import type { ShareLimits } from '../api/types';

export const DEFAULT_SHARE_LIMITS: ShareLimits = {
  maxFiles: 2000,
  maxFileBytes: 200 * 1024 * 1024,
  maxTotalBytes: 10 * 1024 * 1024 * 1024,
  allowedMimeTypes: [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'video/mp4', 'video/quicktime', 'video/webm',
  ],
};

/** Tarayıcı türü boş bıraktığında (bazı işletim sistemlerinde .docx/.mov) uzantıdan tahmin. */
const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

/** İşletim sisteminin ürettiği, kullanıcının paylaşmak istemediği dosyalar sessizce atlanır. */
const SYSTEM_FILE_NAMES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini']);

export type FileRejectionReason = 'type' | 'size' | 'empty' | 'duplicate' | 'count' | 'total';

export function resolveMimeType(file: Pick<File, 'type' | 'name'>): string {
  if (file.type) return file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[extension] ?? '';
}

export function isSystemFile(name: string): boolean {
  return SYSTEM_FILE_NAMES.has(name.toLowerCase()) || name.startsWith('._');
}

/** Tek dosyanın kurala uygunluğu. Adet ve toplam boyut seçimin bütününe bakar (useFileSelection). */
export function validateFile(file: Pick<File, 'type' | 'name' | 'size'>, limits: ShareLimits): FileRejectionReason | null {
  if (!limits.allowedMimeTypes.includes(resolveMimeType(file))) return 'type';
  if (file.size > limits.maxFileBytes) return 'size';
  return null;
}
