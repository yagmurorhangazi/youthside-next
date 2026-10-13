/**
 * [MODÜL: ETKİNLİK KAYIT DURUMU KURALI]
 * Amaç: Etkinlik detayında kayıt panelinin hangi durumda gösterileceğine karar vermek.
 * Öncelik (API kontrol sırasıyla uyumlu, bkz. registrations/create):
 *   bitti → dış kayıt → kayıtlı → kontenjan dolu → misafir → hazır
 */

import { parseDate } from '@/shared/lib/date';

export type RegistrationState = 'ended' | 'external' | 'registered' | 'full' | 'guest' | 'ready';

export interface RegistrationStateInput {
  readonly endDate: string | null;
  readonly externalApplicationUrl: string | null;
  readonly remainingQuota: number | null;
  readonly isLoggedIn: boolean;
  readonly isRegistered: boolean;
}

export function resolveRegistrationState(input: RegistrationStateInput, now: Date = new Date()): RegistrationState {
  const end = parseDate(input.endDate);
  if (end && end < now) return 'ended';
  if (input.externalApplicationUrl) return 'external';
  if (input.isRegistered) return 'registered';
  if (input.remainingQuota !== null && input.remainingQuota <= 0) return 'full';
  if (!input.isLoggedIn) return 'guest';
  return 'ready';
}
