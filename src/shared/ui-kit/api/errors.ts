/**
 * @file API katmanının tek hata tipi. Arayüz hatayı metne değil `status` ve `code`'a göre eşler (utils/shareErrors.ts).
 */

/** Ağ hatası (bağlantı yok, CORS, zaman aşımı) için kullanılan durum kodu. */
export const NETWORK_ERROR_STATUS = 0;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(message: string, status: number, code?: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static network(message = 'Bağlantı kurulamadı.'): ApiError {
    return new ApiError(message, NETWORK_ERROR_STATUS, 'NETWORK_ERROR');
  }

  static unauthorized(): ApiError {
    return new ApiError('Oturum bulunamadı.', 401, 'UNAUTHORIZED');
  }
}

/** Kullanıcı ya da kod tarafından iptal edilen istek. */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function abortError(): DOMException {
  return new DOMException('İşlem iptal edildi.', 'AbortError');
}

/**
 * Tekrar denemek anlamlı mı? Ağ hatası, zaman aşımı, hız sınırı ve sunucu hataları geçicidir.
 * 4xx (doğrulama, yetki) tekrar denenmez: aynı istek aynı sonucu verir.
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return error.status === NETWORK_ERROR_STATUS || error.status === 408 || error.status === 429 || error.status >= 500;
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
