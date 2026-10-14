/**
 * @file Hata → kullanıcı mesajı eşlemesinin tek yeri. Sunucunun `errorCode`'una, yoksa HTTP durumuna bakılır.
 */

import { ApiError, NETWORK_ERROR_STATUS } from '../api/errors';
import type { ShareLimits } from '../api/types';
import { formatBytes } from './formatBytes';
import type { FileRejectionReason } from './uploadRules';

const MESSAGES_BY_CODE: Readonly<Record<string, string>> = {
  UNAUTHORIZED: 'Oturumunuz sona ermiş. Devam etmek için Youthside hesabınızla tekrar giriş yapın.',
  FORBIDDEN: 'Bu alana erişim yetkiniz yok.',
  NETWORK_ERROR: 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.',
  RATE_LIMITED: 'Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.',
  SHARE_NOT_FOUND: 'Bu paylaşım bulunamadı. Link hatalı olabilir ya da paylaşım kaldırılmış olabilir.',
  SHARE_EXPIRED: 'Bu paylaşımın süresi dolmuş.',
  INVALID_PATH: 'Dosya adı ya da klasör yolu geçersiz.',
  INVALID_MIME_TYPE: 'Bu dosya türü desteklenmiyor.',
  INVALID_STORAGE_PATH: 'Dosya kaydedilemedi. Lütfen tekrar deneyin.',
  FILE_TOO_LARGE: 'Bir ya da daha fazla dosya boyut sınırını aşıyor.',
  TOTAL_TOO_LARGE: 'Toplam boyut sınırı aşıldı.',
  TOO_MANY_FILES: 'Çok fazla dosya seçildi.',
  DUPLICATE_PATH: 'Aynı adda iki dosya var.',
  EMPTY_SHARE: 'En az bir dosya ekleyin.',
  FILES_PENDING: 'Bazı dosyalar henüz yüklenmedi.',
  SHARE_NOT_DRAFT: 'Bu transfer zaten tamamlanmış.',
};

const MESSAGES_BY_STATUS: Readonly<Record<number, string>> = {
  [NETWORK_ERROR_STATUS]: MESSAGES_BY_CODE.NETWORK_ERROR as string,
  401: MESSAGES_BY_CODE.UNAUTHORIZED as string,
  403: MESSAGES_BY_CODE.FORBIDDEN as string,
  404: MESSAGES_BY_CODE.SHARE_NOT_FOUND as string,
  410: MESSAGES_BY_CODE.SHARE_EXPIRED as string,
  413: 'Dosya boyutu sınırı aşıldı.',
  429: MESSAGES_BY_CODE.RATE_LIMITED as string,
};

export const GENERIC_ERROR_MESSAGE = 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';

export function getShareErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return (error.code && MESSAGES_BY_CODE[error.code]) || MESSAGES_BY_STATUS[error.status] || GENERIC_ERROR_MESSAGE;
  }
  return GENERIC_ERROR_MESSAGE;
}

export function getRejectionMessage(reason: FileRejectionReason, limits: ShareLimits): string {
  switch (reason) {
    case 'type':
      return 'Desteklenmeyen dosya türü (görsel, PDF, Word, Excel ve video yüklenebilir).';
    case 'size':
      return `Dosya ${formatBytes(limits.maxFileBytes)} sınırını aşıyor.`;
    case 'empty':
      return 'Boş dosya.';
    case 'duplicate':
      return 'Bu adda bir dosya zaten eklendi.';
    case 'count':
      return `En fazla ${limits.maxFiles} dosya eklenebilir.`;
    case 'total':
      return `Toplam boyut ${formatBytes(limits.maxTotalBytes)} sınırını aşıyor.`;
  }
}
