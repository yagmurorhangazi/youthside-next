/**
 * [MODÜL: BAŞVURU DURUMU KURALI]
 * Amaç: İlan detayında başvuru panelinin hangi durumda gösterileceğine karar vermek.
 * Öncelik sırası API'nin kontrol sırasıyla aynıdır (bkz. api-docs-v2 → applications/create):
 *   süre doldu → dış başvuru → misafir → zaten başvurdu → profil eksik → hazır
 * Saf fonksiyondur; sayfa veriyi toplar, karar burada verilir (SRP).
 */

import { parseDate } from '@/shared/lib/date';

export type ApplyState = 'expired' | 'external' | 'guest' | 'applied' | 'incomplete' | 'ready';

export interface ApplyStateInput {
  readonly expirationDate: string | null;
  readonly externalApplicationUrl: string | null;
  readonly isLoggedIn: boolean;
  readonly hasApplied: boolean;
  /** null → hesaplanamadı (API hatası); bu durumda başvuru denenir, API karar verir. */
  readonly isProfileEligible: boolean | null;
}

export function resolveApplyState(input: ApplyStateInput, now: Date = new Date()): ApplyState {
  const expiry = parseDate(input.expirationDate);
  if (expiry && expiry < now) return 'expired';
  if (input.externalApplicationUrl) return 'external';
  if (!input.isLoggedIn) return 'guest';
  if (input.hasApplied) return 'applied';
  if (input.isProfileEligible === false) return 'incomplete';
  return 'ready';
}
