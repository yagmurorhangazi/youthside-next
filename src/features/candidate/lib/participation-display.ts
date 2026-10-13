/**
 * [MODÜL: BAŞVURU / KAYIT GÖRÜNÜM KURALLARI]
 * Amaç: Başvuru ve etkinlik kaydı kayıtlarını liste satırı verisine çevirmek.
 * Durum etiketleri ve renkleri tek yerde tanımlıdır; panelin her yerinde aynı görünür (DRY).
 */

import { ROUTES } from '@/config/site';
import { formatDayMonth, formatRelative, formatTime, parseDate } from '@/shared/lib/date';
import type { MyApplication, MyEventRegistration } from '../types';

type Tone = 'green' | 'gray' | 'orange' | 'blue' | 'red';

export interface RowData {
  readonly href: string;
  readonly title: string;
  readonly companyName: string;
  readonly companyLogo: string | null;
  readonly meta: string | null;
  readonly dateText: string | null;
  readonly badge?: { readonly label: string; readonly tone: Tone };
}

const JOB_STATUS: Record<string, { label: string; tone: Tone }> = {
  YAYINDA: { label: 'İlan aktif', tone: 'green' },
  PASIF: { label: 'İlan kapandı', tone: 'gray' },
  ARSIV: { label: 'İlan kapandı', tone: 'gray' },
  TASLAK: { label: 'İlan kapandı', tone: 'gray' },
};

export function applicationRow(item: MyApplication): RowData {
  const applied = parseDate(item.appliedAt);
  return {
    href: ROUTES.jobPermalink(item.jobSlug),
    title: item.jobTitle,
    companyName: item.companyName,
    companyLogo: item.companyLogo,
    meta: [item.jobType, item.workModel].filter(Boolean).join(' · ') || null,
    dateText: applied ? `${formatRelative(applied)} başvurdun` : null,
    badge: (item.jobStatus && JOB_STATUS[item.jobStatus]) || { label: 'Başvuruldu', tone: 'blue' },
  };
}

const REGISTRATION_STATUS: Record<string, { label: string; tone: Tone }> = {
  KAYITLI: { label: 'Kayıtlı', tone: 'blue' },
  KATILDI: { label: 'Katıldın', tone: 'green' },
  KATILMADI: { label: 'Katılmadın', tone: 'orange' },
  IPTAL: { label: 'İptal edildi', tone: 'red' },
};

export function registrationRow(item: MyEventRegistration, now: Date = new Date()): RowData {
  const start = parseDate(item.startDate);
  const status = (item.status && REGISTRATION_STATUS[item.status]) || REGISTRATION_STATUS.KAYITLI;
  // Kayıtlı ama tarihi geçmiş etkinlik "Tamamlandı" olarak gösterilir (yoklama girilmemiş olabilir).
  const badge = item.status === 'KAYITLI' && start && start < now ? { label: 'Tamamlandı', tone: 'gray' as const } : status;
  return {
    href: ROUTES.eventPermalink(item.eventSlug),
    title: item.eventTitle,
    companyName: item.companyName,
    companyLogo: item.companyLogo,
    meta: item.eventType,
    dateText: start ? `${formatDayMonth(start)} · ${formatTime(start)}` : null,
    badge,
  };
}
