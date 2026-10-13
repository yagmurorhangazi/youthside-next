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

/** HTML'den düz metin üretir (meta description, JSON-LD için). */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  return sanitizeHtml(html.replace(/&nbsp;| /g, ' '), { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();
}
