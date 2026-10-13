/**
 * [MODÜL: ŞİRKET / KULÜP FİLTRE ŞEMASI]
 * Amaç: /sirketler ve /kulupler URL parametrelerini repository filtresine çevirmek.
 *   ?q=…&sirala=a-z&sayfa=2
 */

import { getEnum, getPage, getText } from '@/shared/lib/search-params';
import type { CompanyListFilters, CompanySort, OrganizationType } from '../types';

const SORT_MAP = {
  yeni: 'created_at',
  'a-z': 'name',
  ilan: 'jobs_count',
  etkinlik: 'events_count',
} as const satisfies Record<string, CompanySort>;
type SortKey = keyof typeof SORT_MAP;

/** Kulüpler ilan açamadığı için "ilan sayısı" sıralaması kulüplerde gösterilmez. */
export function companySorts(type: OrganizationType): readonly { value: SortKey; label: string }[] {
  return [
    { value: 'yeni', label: 'En yeni' },
    { value: 'a-z', label: 'İsme göre (A-Z)' },
    ...(type === 'company' ? [{ value: 'ilan' as const, label: 'En çok ilanı olan' }] : []),
    { value: 'etkinlik', label: 'En çok etkinliği olan' },
  ];
}

export interface ParsedCompanyFilters {
  readonly filters: CompanyListFilters;
  readonly sortKey?: SortKey;
}

export function parseCompanyFilters(params: URLSearchParams, type: OrganizationType, limit = 12): ParsedCompanyFilters {
  const sortKey = getEnum(params, 'sirala', Object.keys(SORT_MAP) as SortKey[]);
  return {
    sortKey,
    filters: {
      type,
      q: getText(params, 'q'),
      sort: sortKey ? SORT_MAP[sortKey] : undefined,
      page: getPage(params),
      limit,
    },
  };
}
