/**
 * [MODÜL: ORTAK DOMAIN TİPLERİ]
 * Amaç: Birden fazla alanın (ilan, etkinlik, şirket) paylaştığı küçük veri sözleşmeleri.
 * Neden ayrı: İlan ve etkinlik modülleri birbirini import etmesin; ortak parça burada (DIP).
 */

/** Kartlarda ve detay sayfalarında gösterilen şirket/kulüp özeti. */
export interface CompanyRef {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly logoUrl: string | null;
}

/** Başvuru/kayıt sırasında kabul edilmesi gereken sözleşme (KVKK, açık rıza vb.). */
export interface Contract {
  readonly id: string;
  readonly title: string;
  readonly fileUrl: string | null;
  readonly isRequired: boolean;
}

/** Liste sayfalarındaki filtre seçeneği. */
export interface Option {
  readonly value: string;
  readonly label: string;
}
