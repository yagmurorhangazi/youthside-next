/**
 * [MODÜL: METİN YARDIMCILARI]
 * Amaç: Kartlarda ve başlıklarda tekrar eden metin dönüşümlerini tek yerde toplamak (DRY).
 * Saf fonksiyonlardır; DOM'a veya tarayıcıya bağımlı değildir (SSR'da da çalışır).
 */

/** HTML etiketlerini ve entity'leri temizleyip boşlukları tekilleştirir (ilan açıklaması özetleri için). */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Metni `max` karakterde keser ve sonuna "..." ekler. */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}...` : text;
}

/**
 * Kişi adındaki her parçanın ilk harfini Türkçe yazımına göre büyütür.
 * Devamındaki harfleri değiştirmemek; "McDonald" gibi özel yazımları korur.
 */
export function capitalizePersonName(value: string): string {
  return value.replace(/(^|[\s'’-])(\p{L})/gu, (_, separator: string, letter: string) => {
    return `${separator}${letter.toLocaleUpperCase('tr-TR')}`;
  });
}

/**
 * Ad soyaddan baş harf üretir: "Ayşe Nur Yılmaz" → "AY", "Ayşe" → "A".
 * Avatar görseli olmayan kullanıcı/şirketlerde fallback olarak kullanılır.
 */
export function getInitials(name: string | null | undefined): string {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toLocaleUpperCase('tr-TR');
}
