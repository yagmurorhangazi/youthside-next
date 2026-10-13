/**
 * [MODÜL: ETKİNLİK GÖRÜNÜM KURALLARI]
 * Amaç: Etkinlik kartı ve detayında gösterilen tarih aralığı, takvim rozeti, durum ve konum
 *       metnini üretmek. Saf fonksiyonlardır; bileşenden bağımsız test edilebilir (SRP + DRY).
 */

import {
  formatDay,
  formatDayMonth,
  formatLongDate,
  formatShortMonth,
  formatTime,
  formatWeekday,
  isSameCalendarDay,
  parseDate,
} from '@/shared/lib/date';
import { truncate } from '@/shared/lib/text';
import type { EventSummary } from '../types';

export type EventPhase = 'upcoming' | 'ongoing' | 'ended' | 'unknown';

export interface EventDateInfo {
  /** "13 - 15 Eki", "13 Eki · 10:00" */
  readonly label: string;
  /** Detay sayfası için: "13 Ekim 2026, Salı · 10:00 - 17:00" */
  readonly longLabel: string;
  readonly phase: EventPhase;
  /** Kapak üzerindeki takvim rozeti. Tarih yoksa null. */
  readonly badge: { readonly month: string; readonly days: string } | null;
}

export function getEventDateInfo(event: Pick<EventSummary, 'startDate' | 'endDate'>, now: Date = new Date()): EventDateInfo {
  const start = parseDate(event.startDate);
  const end = parseDate(event.endDate);
  if (!start) return { label: 'Tarih yakında', longLabel: 'Tarih yakında açıklanacak', phase: 'unknown', badge: null };

  // Bitişi olmayan etkinlik başladıktan sonra "devam ediyor" sayılır (API de kayıt almaya devam eder).
  const phase: EventPhase = start > now ? 'upcoming' : end && end < now ? 'ended' : 'ongoing';
  const startDay = formatDay(start);
  const month = formatShortMonth(start);

  if (!end || isSameCalendarDay(start, end)) {
    const timeRange = end ? `${formatTime(start)} - ${formatTime(end)}` : formatTime(start);
    return {
      label: `${formatDayMonth(start)} · ${formatTime(start)}`,
      longLabel: `${formatLongDate(start)}, ${formatWeekday(start)} · ${timeRange}`,
      phase,
      badge: { month, days: startDay },
    };
  }

  const sameMonth = formatShortMonth(start) === formatShortMonth(end);
  return {
    label: sameMonth ? `${startDay} - ${formatDayMonth(end)}` : `${formatDayMonth(start)} - ${formatDayMonth(end)}`,
    longLabel: `${formatLongDate(start)} ${formatTime(start)} — ${formatLongDate(end)} ${formatTime(end)}`,
    phase,
    badge: { month, days: sameMonth ? `${startDay}-${formatDay(end)}` : startDay },
  };
}

/** Kart altında gösterilecek konum metni. */
export function getEventLocationLabel(event: Pick<EventSummary, 'city' | 'location' | 'locationType'>): string {
  if (event.locationType === 'Online') return event.location && event.location !== 'Online' ? `Online · ${event.location}` : 'Online';
  const parts = [event.city, event.location].filter((part): part is string => Boolean(part));
  const unique = parts.filter((part, index) => parts.findIndex((p) => p.toLocaleLowerCase('tr-TR') === part.toLocaleLowerCase('tr-TR')) === index);
  return truncate(unique.join(' · ') || 'Konum yakında', 60);
}

export const PHASE_LABEL: Record<EventPhase, string> = {
  upcoming: 'Yaklaşan',
  ongoing: 'Devam ediyor',
  ended: 'Sona erdi',
  unknown: 'Planlanıyor',
};

/** Oturum saatini "HH:MM"e indirger ("10:00:00", "2026-11-05 10:00" veya "10:00" gelebilir). */
export function formatSessionTime(value: string | null): string | null {
  const match = value ? /(\d{1,2}):(\d{2})/.exec(value) : null;
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : null;
}
