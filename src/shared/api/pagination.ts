/**
 * [MODÜL: SAYFALAMA MODELİ]
 * Amaç: API'nin iki farklı sayfalama biçimini tek modele indirmek.
 *   - jobs/list, applications/my-list → data.pagination { total, limit, offset, has_more? }
 *   - events/list, companies/list     → data.meta { total, limit, offset, page, totalPages }
 * Sayfalar yalnızca `Paginated<T>` görür; API biçimini bilmez.
 */

import { isRecord, num, type UnknownRecord } from './parse';

export interface Paginated<T> {
  readonly items: T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  /** 1'den başlayan sayfa numarası. */
  readonly page: number;
  readonly totalPages: number;
}

export function toPaginated<T>(items: T[], container: unknown, fallbackLimit: number): Paginated<T> {
  const raw: UnknownRecord = isRecord(container) ? container : {};
  const limit = num(raw.limit) || fallbackLimit;
  const offset = num(raw.offset) ?? 0;
  const total = num(raw.total) ?? num(raw.totalCount) ?? items.length;
  return {
    items,
    total,
    limit,
    offset,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** Sayfa numarasından offset hesaplar; geçersiz değerde 1. sayfa. */
export function pageToOffset(page: number, limit: number): number {
  return (Math.max(1, Math.floor(page) || 1) - 1) * limit;
}
