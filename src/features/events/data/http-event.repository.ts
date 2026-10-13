/**
 * [MODÜL: HTTP ETKİNLİK REPOSITORY]
 * Amaç: `EventRepository` sözleşmesini Youthside API ile gerçeklemek.
 * Uçlar: GET events/list (🌐, 60 sn önbellekli) · GET events/get?slug= (🌐)
 *
 * Parametre biçimi (canlı API ile doğrulandı):
 *   - location_type → dizi (`location_type[]=Online`); virgüllü değer sonuç döndürmüyor
 *   - cities        → virgüllü metin
 */

import { ApiError } from '@/shared/api/errors';
import type { HttpClient } from '@/shared/api/http-client';
import { pageToOffset, toPaginated, type Paginated } from '@/shared/api/pagination';
import { isRecord, records } from '@/shared/api/parse';
import type { EventDetail, EventListFilters, EventRepository, EventSummary } from '../types';
import { toEventDetail, toEventSummary } from './event.mappers';

const DEFAULT_LIMIT = 12;

export class HttpEventRepository implements EventRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filters: EventListFilters = {}): Promise<Paginated<EventSummary>> {
    const limit = filters.limit ?? DEFAULT_LIMIT;
    const sort = filters.sort ?? 'start_date';
    const data = await this.http.get<unknown>('events/list', {
      q: filters.q,
      location_type: filters.locationTypes && filters.locationTypes.length > 0 ? filters.locationTypes : undefined,
      cities: filters.cities && filters.cities.length > 0 ? filters.cities.join(',') : undefined,
      company_id: filters.companyId,
      active: filters.activeOnly ? 1 : undefined,
      sort,
      // Yaklaşan etkinlik önce; "en yeni / popüler" sıralamalarında azalan.
      dir: sort === 'start_date' ? 'ASC' : 'DESC',
      limit,
      offset: pageToOffset(filters.page ?? 1, limit),
    });
    const container = isRecord(data) ? data : {};
    return toPaginated(records(container.data).map(toEventSummary), container.meta, limit);
  }

  async getBySlug(slug: string): Promise<EventDetail | null> {
    try {
      const data = await this.http.get<unknown>('events/get', { slug });
      return isRecord(data) ? toEventDetail(data) : null;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
      throw error;
    }
  }
}
