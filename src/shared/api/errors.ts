/**
 * [MODÜL: API HATA MODELİ]
 * Amaç: API'nin farklı biçimlerdeki hata yanıtlarını tek bir sınıfta toplamak.
 *
 * API'de iki hata biçimi var (bkz. docs/api-docs-v2.md → "Yanıt zarfı"):
 *   - Standart: { status: "error", code, message, errors?, questions?, contracts?, missing_fields? }
 *   - AuthMiddleware (401/403): { status: "error", message, errorCode?, details? } — `code` yok
 * Üst katmanlar yalnızca `ApiError`'u tanır; ham yanıt biçimini bilmez (SRP).
 */

export class ApiError extends Error {
  /** HTTP durum kodu. Ağ/zaman aşımı hatalarında 0. */
  readonly status: number;
  /** Ör. ENTITY_TYPE_FORBIDDEN */
  readonly errorCode: string | null;
  /** Hata gövdesinin tamamı — `questions`, `contracts`, `missing_fields` gibi ek alanlar için. */
  readonly payload: Record<string, unknown>;

  constructor(message: string, status: number, payload: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.errorCode = typeof payload.errorCode === 'string' ? payload.errorCode : null;
  }

  /** `errors` nesnesi (alan bazlı doğrulama, require_otp, remaining_seconds vb.). */
  get errors(): Record<string, unknown> {
    const value = this.payload.errors;
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

/** Kullanıcıya gösterilebilecek genel mesaj (teknik detay sızdırmaz). */
export const GENERIC_ERROR_MESSAGE = 'Bir şeyler ters gitti. Lütfen biraz sonra tekrar deneyin.';
export const NETWORK_ERROR_MESSAGE = 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
