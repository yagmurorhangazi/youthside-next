/**
 * [MODÜL: SON BAŞVURU ETİKETİ]
 * Amaç: İlanın son başvuru tarihine göre kullanıcıya gösterilecek metni ve aciliyet seviyesini üretmek.
 * Neden ayrı: İş kuralı (kaç gün kala uyarı verilir) görünümden bağımsız test edilebilir ve
 *             ilan kartı, ilan detayı, panel gibi her yerde aynı sonucu verir (SRP + DRY).
 */

import { daysBetween, formatDayMonth, parseDate } from '@/shared/lib/date';

export type DeadlineTone = 'muted' | 'normal' | 'soon' | 'urgent' | 'expired';

export interface DeadlineInfo {
  readonly label: string;
  readonly tone: DeadlineTone;
}

/** Referans projedeki eşikler: 0 gün = bugün, ≤3 gün = acil, ≤7 gün = yaklaşıyor. */
export function getDeadlineInfo(expirationDate: string | null, now: Date = new Date()): DeadlineInfo {
  const expiry = parseDate(expirationDate);
  if (!expiry) return { label: 'Belirtilmemiş', tone: 'muted' };

  const diff = daysBetween(now, expiry);
  const formatted = formatDayMonth(expiry);

  if (diff < 0) return { label: 'Süresi Doldu', tone: 'expired' };
  if (diff === 0) return { label: 'Bugün Son Gün!', tone: 'urgent' };
  if (diff <= 3) return { label: `Son ${diff} gün`, tone: 'urgent' };
  if (diff <= 7) return { label: `Son ${diff} gün • ${formatted}`, tone: 'soon' };
  return { label: formatted, tone: 'normal' };
}
