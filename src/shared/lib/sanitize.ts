/**
 * [MODÜL: HTML TEMİZLEME — YALNIZCA SUNUCU]
 * Amaç: API'den gelen ham HTML'i (ilan açıklaması, şirket hakkında, kültür blokları)
 *       XSS'e karşı güvenli hale getirmek.
 * Referans: docs/api-docs-v2.md → "description / about alanları ham HTML'dir; render
 *           etmeden önce temizlenmelidir".
 *
 * Ek düzeltmeler:
 *   - Editörden gelen `&nbsp;` zinciri kelimeleri birleştirip mobilde satır taşmasına yol açıyor;
 *     normal boşluğa çevrilir.
 *   - Satır içi stiller (editörden kopyalanan renkler) kaldırılır; tipografi sitenin temasından gelir.
 *   - Dış linkler yeni sekmede ve `noopener noreferrer` ile açılır.
 */

import sanitizeHtml from 'sanitize-html';

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'ul', 'ol', 'li',
    'h2', 'h3', 'h4', 'blockquote', 'hr', 'img', 'span', 'div',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  transformTags: {
    // h1 sayfada tek olmalı (SEO); içerikteki başlıklar bir kademe düşürülür.
    h1: 'h2',
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer nofollow' }),
    img: sanitizeHtml.simpleTransform('img', { loading: 'lazy' }),
  },
  // Tamamen boş paragrafları at (<p></p>, <p> </p>)
  exclusiveFilter: (frame) => frame.tag === 'p' && !frame.text.trim() && !frame.mediaChildren.length,
};

export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return '';
  const normalized = html.replace(/&nbsp;| /g, ' ');
  return sanitizeHtml(normalized, OPTIONS).trim();
}

/* ── Hakkımızda profili (Quill 2 çıktısı) ──
   Neden ayrı profil: Şirket "Hakkımızda" editörü görsel/video ve hizalama sınıfları üretir; bunlara
   genel profilde (ilan açıklaması, kültür blokları) izin vermek saldırı yüzeyini gereksiz büyütür.
   Referans: youthside-2026-ui → sirket-profili/index.php `.company-about` (feature/hakkimizda-medya). */

/** Hakkımızda videolarının barındığı CDN (canlı API yanıtında doğrulandı). */
const ABOUT_VIDEO_HOSTS = ['youthsidecdn.doracdn.com'];

/** Quill hizalama + quill-resize-module konum sınıfları; başka sınıf geçmez. */
const QUILL_CLASSES = [
  'ql-align-center', 'ql-align-right', 'ql-align-justify',
  'ql-resize-style-left', 'ql-resize-style-right', 'ql-resize-style-center', 'ql-resize-style-full',
];

/**
 * CDN videoları süreli imzayla (`sign` parametresi) açılır; imzasız adres 403 döner.
 * İmzasız video bozuk bir oynatıcı göstermek yerine çıkarılır. İmza API tarafından eklendiğinde
 * video ek değişiklik gerekmeden görünür. (İmza anahtarı bu projeye bilinçli olarak konmaz.)
 */
function isPlayableAboutVideo(src: string | undefined): boolean {
  if (!src) return false;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && ABOUT_VIDEO_HOSTS.includes(url.hostname) && url.searchParams.has('sign');
  } catch {
    return false;
  }
}

const ABOUT_OPTIONS: sanitizeHtml.IOptions = {
  ...OPTIONS,
  allowedTags: [...(OPTIONS.allowedTags || []), 'video'],
  allowedAttributes: {
    ...OPTIONS.allowedAttributes,
    img: ['src', 'alt', 'width', 'height', 'loading', 'class'],
    video: ['src', 'width', 'height', 'controls', 'preload', 'playsinline', 'class'],
    p: ['class'],
    li: ['class', { name: 'data-list', values: ['bullet', 'ordered'] }],
    span: ['class'],
  },
  allowedClasses: { '*': QUILL_CLASSES },
  transformTags: {
    ...OPTIONS.transformTags,
    // Oynatma denetimleri her zaman açık; otomatik oynatma/ses editörden gelse bile atılır.
    video: (tagName, attribs) => ({ tagName, attribs: { ...attribs, controls: '', preload: 'metadata', playsinline: '' } }),
  },
  exclusiveFilter: (frame) =>
    (frame.tag === 'video' && !isPlayableAboutVideo(frame.attribs.src)) ||
    (frame.tag === 'p' && !frame.text.trim() && !frame.mediaChildren.length),
};

/** Şirket/kulüp "Hakkımızda" metnini temizler: genel kurallar + Quill görsel/video ve hizalama desteği. */
export function sanitizeAboutHtml(html: string | null | undefined): string {
  if (!html) return '';
  const normalized = html.replace(/&nbsp;|\u00a0/g, ' ');
  return sanitizeHtml(normalized, ABOUT_OPTIONS).trim();
}

/** HTML'den düz metin üretir (meta description, JSON-LD için). */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  return sanitizeHtml(html.replace(/&nbsp;| /g, ' '), { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();
}
