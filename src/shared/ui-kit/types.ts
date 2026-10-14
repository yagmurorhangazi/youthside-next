/**
 * @file Paket genelinde paylaşılan yardımcı tipler.
 * Author: Ferhat Cengiz
 */

/**
 * UiTerminology, hesap türüne göre değişen metinleri bileşenlere dışarıdan
 * enjekte etmek için kullanılır. Paket domain'e (auth/company type) bağlı
 * olmasın diye hook yerine prop olarak alınır; tüketici uygulama kendi
 * terminoloji kaynağını bağlar.
 */
export interface UiTerminology {
  /** Örn. "Kurum Logosu" / "Şirket Logosu" */
  logo?: string;
  /** Örn. "kurumunuzun" / "şirketinizin" */
  possessiveLower?: string;
}
