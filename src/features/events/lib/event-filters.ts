/**
 * [MODÜL: ETKİNLİK FİLTRE ŞEMASI]
 * Amaç: /etkinlikler URL parametrelerini repository filtresine çevirmek.
 *   ?q=…&tur=Online,Fiziksel&sehir=İstanbul&gecmis=1&sirala=yeni&sayfa=2
 * Varsayılan: yalnızca bitmemiş etkinlikler; "gecmis=1" ile geçmiş etkinlikler de listelenir.
 */

import { getEnum, getList, getPage, getText } from '@/shared/lib/search-params';
import type { EventListFilters, EventLocationType, EventSort } from '../types';

export const EVENT_PARAMS = {
  locationTypes: 'tur',
  cities: 'sehir',
  includePast: 'gecmis',
} as const;

export const EVENT_LOCATION_TYPES: readonly EventLocationType[] = ['Online', 'Fiziksel', 'Hibrit'];

const SORT_MAP = { yaklasan: 'start_date', yeni: 'created_at', populer: 'view_count' } as const satisfies Record<string, EventSort>;
type SortKey = keyof typeof SORT_MAP;

export const EVENT_SORTS: readonly { value: SortKey; label: string }[] = [
  { value: 'yaklasan', label: 'Tarihe göre' },
  { value: 'yeni', label: 'En yeni eklenen' },
  { value: 'populer', label: 'En popüler' },
];

export interface ParsedEventFilters {
  readonly filters: EventListFilters;
  readonly sortKey?: SortKey;
  readonly values: Record<string, string[]>;
  readonly includePast: boolean;
}

export function parseEventFilters(params: URLSearchParams, limit = 12): ParsedEventFilters {
  const locationTypes = getList(params, EVENT_PARAMS.locationTypes).filter((value): value is EventLocationType =>
    (EVENT_LOCATION_TYPES as readonly string[]).includes(value),
  );
  const cities = getList(params, EVENT_PARAMS.cities);
  const includePast = params.get(EVENT_PARAMS.includePast) === '1';
  const sortKey = getEnum(params, 'sirala', Object.keys(SORT_MAP) as SortKey[]);

  return {
    sortKey,
    includePast,
    values: { [EVENT_PARAMS.locationTypes]: locationTypes, [EVENT_PARAMS.cities]: cities },
    filters: {
      q: getText(params, 'q'),
      locationTypes,
      cities,
      activeOnly: !includePast,
      sort: sortKey ? SORT_MAP[sortKey] : undefined,
      page: getPage(params),
      limit,
    },
  };
}
