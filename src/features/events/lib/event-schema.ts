/**
 * [MODÜL: ETKİNLİK YAPILANDIRILMIŞ VERİSİ (JSON-LD)]
 * Amaç: Arama motorlarının etkinliği zengin sonuç olarak gösterebilmesi için schema.org/Event üretmek.
 * Kaynak: https://developers.google.com/search/docs/appearance/structured-data/event
 */

import { ROUTES, SITE } from '@/config/site';
import type { EventDetail } from '../types';

const ATTENDANCE: Record<string, string> = {
  Online: 'https://schema.org/OnlineEventAttendanceMode',
  Fiziksel: 'https://schema.org/OfflineEventAttendanceMode',
  Hibrit: 'https://schema.org/MixedEventAttendanceMode',
};

export function buildEventSchema(event: EventDetail): Record<string, unknown> {
  const url = new URL(ROUTES.eventDetail(event.company.slug, event.slug), SITE.url).href;
  const place = {
    '@type': 'Place',
    name: event.location ?? event.city ?? 'Türkiye',
    address: { '@type': 'PostalAddress', addressLocality: event.city ?? undefined, addressCountry: 'TR' },
  };
  const virtual = { '@type': 'VirtualLocation', url };

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.excerpt,
    startDate: event.startDate ?? undefined,
    endDate: event.endDate ?? undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: (event.locationType && ATTENDANCE[event.locationType]) || undefined,
    location: event.locationType === 'Online' ? virtual : event.locationType === 'Hibrit' ? [place, virtual] : place,
    image: event.imageUrl ? [event.imageUrl] : undefined,
    organizer: { '@type': 'Organization', name: event.company.name, url: new URL(ROUTES.company(event.company.slug), SITE.url).href },
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'TRY', availability: 'https://schema.org/InStock', url },
  };
}
