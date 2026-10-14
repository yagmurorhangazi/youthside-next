/**
 * [MODÜL: ISLAND'LAR ARASI SİNYALLER — NANOSTORES]
 * Amaç: Birbirinden bağımsız React island'larının sayfa yenilemeden haberleşmesi.
 *
 * Neden: Astro'da her island ayrı bir React köküdür; ortak state için prop zinciri yoktur.
 * Modül tekil olduğu için tüm island'lar aynı atom'u görür (~1 KB, zaten bağımlılıkta).
 * Profil doluluğu sinyali `features/candidate/store.ts`'tedir.
 *   - `$participationDone`: Popup başvuruyu/kaydı gönderince aynı sayfadaki ApplyPanel/RegisterPanel
 *     "Başvurun alındı" durumuna geçer.
 * Yalnızca istemci verisi taşır; sunucu tarafı state oturumdadır.
 */

import { atom } from 'nanostores';
import type { IntentKind } from './types';

export interface ParticipationSignal {
  readonly kind: IntentKind;
  readonly targetId: string;
}

export const $participationDone = atom<ParticipationSignal | null>(null);
