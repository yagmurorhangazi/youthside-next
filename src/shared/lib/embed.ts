/**
 * [MODÜL: GÖMÜLÜ İÇERİK YARDIMCILARI]
 * Amaç: Kullanıcı girdisi olan harita/video kodlarından yalnızca güvenli embed adreslerini çıkarmak.
 * Güvenlik: Ham iframe HTML'i asla render edilmez; yalnızca beyaz listedeki alan adlarına ait
 *           `src` alınıp sitenin kendi iframe'inde kullanılır (XSS önlemi).
 */

/** iframe kodundan yalnızca Google Maps embed adresini çıkarır. */
export function extractMapEmbedUrl(value: string | null): string | null {
  if (!value || !value.includes('<iframe')) return null;
  const src = /src=["']([^"']+)["']/i.exec(value)?.[1] ?? null;
  return src && /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/i.test(src) ? src.replace(/&amp;/g, '&') : null;
}

/** YouTube izleme linkini gizlilik dostu (çerezsiz) embed adresine çevirir. */
export function toYoutubeEmbed(url: string): string | null {
  const match = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i.exec(url);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}
