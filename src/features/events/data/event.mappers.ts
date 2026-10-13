/**
 * [MODÜL: ETKİNLİK MAPPER'LARI]
 * Amaç: events/list ve events/get yanıtlarını domain modeline çevirmek.
 *
 * Güvenlik: `location` alanına harita iframe kodu yazılabiliyor. Ham iframe asla render
 * edilmez; yalnızca `src` içindeki google.com/maps adresi çıkarılıp kendi iframe'imizde kullanılır.
 */

import { apiDate, bool, num, records, str, type UnknownRecord } from '@/shared/api/parse';
import { extractMapEmbedUrl } from '@/shared/lib/embed';
import { htmlToText, sanitizeRichText } from '@/shared/lib/sanitize';
import { truncate } from '@/shared/lib/text';
import { toCompanyRef, toContracts } from '../../common/mappers';
import type { EventDetail, EventLocationType, EventSession, EventSpeaker, EventSummary } from '../types';

const LOCATION_TYPES: readonly EventLocationType[] = ['Online', 'Fiziksel', 'Hibrit'];

function toLocationType(value: unknown): EventLocationType | null {
  const text = str(value);
  return text && (LOCATION_TYPES as readonly string[]).includes(text) ? (text as EventLocationType) : null;
}

/** Panelden "-", "—", "." gibi yer tutucu girilebiliyor; bunlar boş kabul edilir. */
const meaningful = (value: string | null) => (value && /[\p{L}\d]/u.test(value) ? value : null);

export function toEventSummary(raw: UnknownRecord): EventSummary {
  const location = meaningful(str(raw.location));
  const quota = num(raw.quota);
  return {
    id: str(raw.id) ?? str(raw.event_id) ?? '',
    slug: str(raw.slug) ?? str(raw.event_slug) ?? '',
    title: str(raw.title) ?? str(raw.event_title) ?? 'Etkinlik',
    excerpt: truncate(htmlToText(str(raw.description)), 200),
    type: str(raw.type) ?? str(raw.event_type),
    locationType: toLocationType(raw.location_type),
    city: meaningful(str(raw.city)),
    // iframe ise metin olarak gösterilmez
    location: location && location.includes('<iframe') ? null : location,
    imageUrl: str(raw.image_url) ?? str(raw.cover_image_url),
    startDate: apiDate(raw.start_date),
    endDate: apiDate(raw.end_date),
    // 0 = kontenjan belirtilmemiş
    quota: quota && quota > 0 ? quota : null,
    isPinned: bool(raw.is_pinned),
    company: toCompanyRef(raw),
  };
}

function toSpeaker(raw: UnknownRecord): EventSpeaker {
  const company = raw.company && typeof raw.company === 'object' ? (raw.company as UnknownRecord) : {};
  return {
    id: str(raw.id) ?? '',
    name: str(raw.name) ?? 'Konuşmacı',
    role: str(raw.role) ?? str(raw.title),
    imageUrl: str(raw.image) ?? str(raw.image_url),
    linkedinUrl: str(raw.linkedin),
    companyName: str(company.name),
  };
}

function toSession(raw: UnknownRecord): EventSession {
  return {
    id: str(raw.id) ?? '',
    title: str(raw.title) ?? 'Oturum',
    description: htmlToText(str(raw.description)) || null,
    startTime: str(raw.start_time),
    endTime: str(raw.end_time),
    speakers: records(raw.speakers).map(toSpeaker),
  };
}

export function toEventDetail(raw: UnknownRecord): EventDetail {
  const rawLocation = str(raw.location);
  const remaining = num(raw.remaining_quota);
  const external = bool(raw.is_external_application) ? str(raw.external_application_url) : null;
  return {
    ...toEventSummary(raw),
    excerpt: truncate(htmlToText(str(raw.description)), 300),
    descriptionHtml: sanitizeRichText(str(raw.description)),
    mapEmbedUrl: extractMapEmbedUrl(rawLocation),
    locationLink: str(raw.location_link),
    registrationCount: num(raw.registration_count) ?? 0,
    remainingQuota: remaining,
    externalApplicationUrl: external,
    program: records(raw.program)
      .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0))
      .map(toSession),
    speakers: records(raw.speakers).map(toSpeaker),
    contracts: toContracts(raw.contracts),
  };
}
