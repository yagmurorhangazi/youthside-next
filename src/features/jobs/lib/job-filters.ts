/**
 * [MODÜL: İLAN FİLTRE ŞEMASI]
 * Amaç: /ilanlar sayfasının URL parametrelerini (Türkçe, okunabilir) repository filtresine çevirmek.
 *   ?q=yazılım&tip=Staj&model=Hibrit&sehir=İstanbul,Kocaeli&sirala=populer&sayfa=2
 * Parametre adları tek yerde; FilterBar ve sayfa aynı sabitleri kullanır (DRY).
 * Neden kategori yok: API kategori alanı serbest metindir ve güvenilir bir seçenek listesi
 * sağlamaz. Yanlış/boş sonuç üreten bir filtre göstermek yerine doğrulanmış alanlar kullanılır.
 */

import { getEnum, getList, getPage, getText } from '@/shared/lib/search-params';
import type { JobListFilters, JobSort } from '../types';

export const JOB_PARAMS = {
  types: 'tip',
  workModels: 'model',
  locations: 'sehir',
} as const;

const SORT_MAP = { yeni: 'publish_date', populer: 'view_count', 'a-z': 'title' } as const satisfies Record<string, JobSort>;
type SortKey = keyof typeof SORT_MAP;

export const JOB_SORTS: readonly { value: SortKey; label: string }[] = [
  { value: 'yeni', label: 'En yeni' },
  { value: 'populer', label: 'En çok görüntülenen' },
  { value: 'a-z', label: 'Başlığa göre (A-Z)' },
];

export interface ParsedJobFilters {
  readonly filters: JobListFilters;
  readonly sortKey?: SortKey;
  readonly values: Record<string, string[]>;
}

export function parseJobFilters(params: URLSearchParams, limit = 12): ParsedJobFilters {
  const values = {
    [JOB_PARAMS.types]: getList(params, JOB_PARAMS.types),
    [JOB_PARAMS.workModels]: getList(params, JOB_PARAMS.workModels),
    [JOB_PARAMS.locations]: getList(params, JOB_PARAMS.locations),
  };
  const sortKey = getEnum(params, 'sirala', Object.keys(SORT_MAP) as SortKey[]);
  return {
    sortKey,
    values,
    filters: {
      q: getText(params, 'q'),
      types: values[JOB_PARAMS.types],
      workModels: values[JOB_PARAMS.workModels],
      locations: values[JOB_PARAMS.locations],
      sort: sortKey ? SORT_MAP[sortKey] : undefined,
      page: getPage(params),
      limit,
    },
  };
}
