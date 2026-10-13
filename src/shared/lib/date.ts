/**
 * [MODÜL: TARİH YARDIMCILARI]
 * Amaç: Türkçe tarih biçimlendirme ve gün farkı hesaplarını tek kaynakta tutmak.
 *
 * Saat dilimi: Tüm biçimlendirme Europe/Istanbul ile yapılır. Sunucu (SSR) UTC'de
 * çalışsa bile kullanıcı "10:00" görür; tarayıcıyla sunucu arasında fark oluşmaz.
 */

const TIME_ZONE = 'Europe/Istanbul';
const LOCALE = 'tr-TR';

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, ...options });

const shortMonthFmt = fmt({ month: 'short' });
const dayFmt = fmt({ day: '2-digit' });
const longDateFmt = fmt({ day: 'numeric', month: 'long', year: 'numeric' });
const dayMonthLongFmt = fmt({ day: 'numeric', month: 'long' });
const weekdayFmt = fmt({ weekday: 'long' });
const timeFmt = fmt({ hour: '2-digit', minute: '2-digit' });
const ymdFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

/** "Eki" gibi kısa ay adı (noktasız). */
export function formatShortMonth(date: Date): string {
  return shortMonthFmt.format(date).replace('.', '');
}

/** Ayın gününü iki haneli döndürür: 3 → "03". */
export function formatDay(date: Date): string {
  return dayFmt.format(date);
}

/** "13 Eki" */
export function formatDayMonth(date: Date): string {
  return `${formatDay(date)} ${formatShortMonth(date)}`;
}

/** "13 Ekim" */
export function formatDayMonthLong(date: Date): string {
  return dayMonthLongFmt.format(date);
}

/** "13 Ekim 2026" */
export function formatLongDate(date: Date): string {
  return longDateFmt.format(date);
}

/** "Salı" */
export function formatWeekday(date: Date): string {
  return weekdayFmt.format(date);
}

/** "10:00" */
export function formatTime(date: Date): string {
  return timeFmt.format(date);
}

/** İstanbul takvimine göre "2026-10-13" (gün karşılaştırması için). */
export function toCalendarDay(date: Date): string {
  return ymdFmt.format(date);
}

/** İki tarih arasındaki takvim günü farkı (İstanbul saatine göre; geçmiş için negatif). */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.parse(`${toCalendarDay(from)}T00:00:00Z`);
  const b = Date.parse(`${toCalendarDay(to)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return toCalendarDay(a) === toCalendarDay(b);
}

/** ISO metnini güvenli şekilde Date'e çevirir; geçersizse null döner. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const relativeFmt = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

/** "bugün", "dün", "3 gün önce", "2 hafta önce" */
export function formatRelative(date: Date, now: Date = new Date()): string {
  const days = daysBetween(now, date);
  if (Math.abs(days) < 7) return relativeFmt.format(days, 'day');
  if (Math.abs(days) < 30) return relativeFmt.format(Math.round(days / 7), 'week');
  if (Math.abs(days) < 365) return relativeFmt.format(Math.round(days / 30), 'month');
  return relativeFmt.format(Math.round(days / 365), 'year');
}
