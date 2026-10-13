/**
 * [MODÜL: URL ARAMA PARAMETRELERİ]
 * Amaç: Liste sayfalarındaki filtre durumunu URL'de tutmak ve okumak.
 * Neden URL: Filtrelenmiş sonuç paylaşılabilir, geri tuşu çalışır ve arama motoru taranabilir.
 *
 * Biçim: Çoklu değerler virgülle ayrılır → `?tip=Staj,Tam Zamanlı&sehir=İstanbul&sayfa=2`
 * Hem sunucuda (Astro.url) hem tarayıcıda (FilterBar) aynı fonksiyonlar kullanılır (DRY).
 */

export type ParamState = Record<string, string | string[] | undefined>;

/** Çoklu seçim parametresini diziye çevirir. */
export function getList(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key);
  return raw ? raw.split(',').map((item) => item.trim()).filter(Boolean) : [];
}

export function getText(params: URLSearchParams, key: string, maxLength = 100): string | undefined {
  const value = params.get(key)?.trim();
  return value ? value.slice(0, maxLength) : undefined;
}

/** Yalnızca izin verilen değerlerden birini kabul eder (sıralama gibi). */
export function getEnum<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]): T | undefined {
  const value = params.get(key);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function getPage(params: URLSearchParams, key = 'sayfa'): number {
  const page = Number(params.get(key));
  return Number.isInteger(page) && page > 0 && page < 10_000 ? page : 1;
}

/** Durum nesnesinden göreli URL üretir; boş değerler atlanır. */
export function buildHref(pathname: string, state: ParamState): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(state)) {
    if (Array.isArray(value)) {
      if (value.length > 0) search.set(key, value.join(','));
    } else if (value) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Mevcut URL'i koruyarak yalnızca sayfa numarasını değiştirir. */
export function withPage(url: URL, page: number, key = 'sayfa'): string {
  const next = new URLSearchParams(url.searchParams);
  if (page <= 1) next.delete(key);
  else next.set(key, String(page));
  const query = next.toString();
  return query ? `${url.pathname}?${query}` : url.pathname;
}
