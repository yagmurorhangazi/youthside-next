/**
 * [MODÜL: NİYET YAKALAYAN LİNK İŞLEYİCİSİ — İSTEMCİ]
 * Amaç: "Giriş yap ve başvur", "Kayıt ol", "Profilimi tamamla" gibi linklere tıklanınca önce niyeti
 *       sunucu oturumuna kaydedip sonra linke gitmek.
 *
 * Progressive enhancement: Link zaten `?redirect=` taşır. JS yoksa ya da kayıt başarısız olursa
 * kullanıcı yine aynı yere gider; yalnızca kalıcı hatırlatma kaybolur. Yeni sekmede açma
 * (Ctrl/Cmd+tık, orta tık) bozulmaz.
 */

import { actions } from 'astro:actions';
import type { MouseEvent } from 'react';
import type { IntentKind } from './types';

export function captureIntentOnClick(kind: IntentKind, slug: string) {
  return async (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const href = event.currentTarget.href;
    await actions.intent.capture({ kind, slug });
    window.location.assign(href);
  };
}
