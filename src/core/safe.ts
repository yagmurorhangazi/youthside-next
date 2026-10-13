/**
 * [MODÜL: HATA TOLERANSLI VERİ ÇAĞRISI]
 * Amaç: Bir sayfada birden fazla bağımsız bölüm varken, birinin hatası diğerlerini düşürmesin.
 * Hata sunucu loguna yazılır ve `null` döner; bileşen boş durumunu gösterir.
 *
 * Kullanım:
 *   const safe = createSafeLoader('ANA_SAYFA');
 *   const jobs = await safe(services.jobs.list(), 'Son ilanlar');   // → Paginated | null
 */

export function createSafeLoader(scope: string) {
  return async function safe<T>(promise: Promise<T>, label: string): Promise<T | null> {
    try {
      return await promise;
    } catch (error) {
      console.error(`[${scope}] ${label} yüklenemedi:`, error);
      return null;
    }
  };
}
