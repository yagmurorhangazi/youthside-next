/**
 * @file Router'dan bağımsız navigasyon yardımcıları.
 * Author: Ferhat Cengiz
 *
 * ATS admin, çağrı merkezi ve cash panellerinde ayrı ayrı yazılmış
 * `isAdminPathActive` / `isMenuPathActive` / `openAdminMenuItem` kurallarının tek kaynağı.
 */

import type { NavItem } from './types';

/**
 * Yol aktiflik kuralı: `exact` ise birebir eşleşme, değilse segment sınırına
 * dikkat eden prefix eşleşmesi (`/admin/ilan` → `/admin/ilanlar`'ı aktif YAPMAZ).
 */
export function isPathActive(itemPath: string, currentPath: string, exact = false): boolean {
  const normalize = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p);
  const item = normalize(itemPath);
  const current = normalize(currentPath);

  if (exact || item === '/') {
    return current === item;
  }
  return current === item || current.startsWith(`${item}/`);
}

/**
 * Mevcut yola en iyi uyan öğenin anahtarını döndürür. Birden fazla öğe eşleşirse
 * en uzun `href` kazanır (`/admin` ile `/admin/sirketler` birlikte varken doğru seçim).
 */
export function findActiveNavKey(
  items: readonly NavItem[],
  currentPath: string,
): string | null {
  let best: NavItem | null = null;

  for (const item of items) {
    if (!item.href || item.external) continue;
    if (!isPathActive(item.href, currentPath, item.exact)) continue;
    if (!best || item.href.length > (best.href?.length ?? 0)) best = item;
  }

  return best?.key ?? null;
}

/**
 * Öğeyi açar: harici öğe → yeni sekme, diğerleri → `onNavigate` (SPA),
 * callback yoksa düz sayfa geçişi.
 */
export function activateNavItem(item: NavItem, onNavigate?: (item: NavItem) => void): void {
  if (item.external && item.href) {
    window.open(item.href, '_blank', 'noopener,noreferrer');
    return;
  }
  if (onNavigate) {
    onNavigate(item);
    return;
  }
  if (item.href) {
    window.location.assign(item.href);
  }
}

/** Baş harf avatarı için güvenli ilk karakter. */
export function getInitial(name: string | undefined, fallback = 'Y'): string {
  return name?.trim().charAt(0).toLocaleUpperCase('tr-TR') || fallback;
}
