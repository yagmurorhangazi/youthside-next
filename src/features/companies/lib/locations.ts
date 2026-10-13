/**
 * [MODÜL: ŞİRKET / KULÜP KONUMLARI — İŞ KURALLARI]
 * Amaç: Profilin `addresses[]` listesinden konum adı, seçili konum ve yol tarifi bağlantısı üretmek.
 * Neden ayrı modül: Genel bakış kartı ve Konumlar sekmesi aynı adlandırma kuralını kullanır (DRY);
 *                   bileşenler yalnızca render eder (SRP).
 * Referans: youthside-2026-ui (yeni-is-veren-header) → sirket-profili/konumlar/index.php, _sidebar.php
 */

import { ROUTES } from '@/config/site';
import type { CompanyAddress } from '../types';

/**
 * Seçili konumun URL parametresi: /{slug}/konumlar?konum=1 (ikinci konum).
 * Neden 0 tabanlı: Referans sitedeki paylaşılmış bağlantılar aynı konumu açmaya devam etsin.
 */
export const LOCATION_PARAM = 'konum';

/** Konum panelinin kimliği (referansla aynı çapa); seçimden sonra mobilde sayfa doğrudan detaya kayar. */
export const LOCATION_DETAIL_ID = 'konum-haritasi';

/** Başlığı girilmemiş adreslere referanstaki gibi sıraya göre ad verilir. */
export function locationLabel(address: Pick<CompanyAddress, 'title'>, index: number): string {
  return address.title ?? (index === 0 ? 'Merkez Ofis' : `Ofis ${index + 1}`);
}

/** `?konum=N` → dizi indeksi. Eksik, sayı olmayan veya aralık dışı değer ilk konuma düşer (sayfa hata vermez). */
export function selectedLocationIndex(params: URLSearchParams, count: number): number {
  const value = Number(params.get(LOCATION_PARAM));
  return Number.isInteger(value) && value >= 0 && value < count ? value : 0;
}

export function locationHref(slug: string, index: number): string {
  return `${ROUTES.companyLocations(slug)}?${LOCATION_PARAM}=${index}#${LOCATION_DETAIL_ID}`;
}

/**
 * Google Maps yol tarifi bağlantısı (resmî Maps URLs biçimi: /maps/dir/?api=1&destination=).
 * Güvenlik: Adres metni yalnızca sorgu parametresi olarak kodlanır; alan adı sabittir, kullanıcı
 * girdisi URL'nin geri kalanını değiştiremez. Adres metni yoksa bağlantı üretilmez.
 * Editörden kopyalanan baştaki madde işareti ("• Çamçeşme Mah…") aramayı bozduğu için atılır.
 */
export function directionsUrl(address: Pick<CompanyAddress, 'address'>): string | null {
  const destination = address.address?.replace(/^\s*[•·]\s*/u, '').trim();
  if (!destination) return null;
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('destination', destination);
  return url.href;
}
