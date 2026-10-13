/**
 * [MODÜL: HTTP İLAN REPOSITORY]
 * Amaç: `JobRepository` sözleşmesini Youthside API ile gerçeklemek.
 * Uçlar: GET jobs/list (🌐) · GET jobs/get?slug= (🌐) · GET jobs/recommended (🔒 aday)
 *
 * Parametre biçimi: jobs/list çoklu değerleri virgülle kabul ediyor (bkz. api-docs-v2 → jobs/list).
 */

import { ApiError } from '@/shared/api/errors';
import type { HttpClient } from '@/shared/api/http-client';
import { pageToOffset, toPaginated, type Paginated } from '@/shared/api/pagination';
import { isRecord, records } from '@/shared/api/parse';
import type { JobDetail, JobListFilters, JobRepository, JobSummary } from '../types';
import { toJobDetail, toJobSummary } from './job.mappers';

const DEFAULT_LIMIT = 12;

/** Çoklu seçimi API'nin beklediği virgüllü metne çevirir. */
const csv = (values?: readonly string[]) => (values && values.length > 0 ? values.join(',') : undefined);

export class HttpJobRepository implements JobRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filters: JobListFilters = {}): Promise<Paginated<JobSummary>> {
    const limit = filters.limit ?? DEFAULT_LIMIT;
    const data = await this.http.get<unknown>('jobs/list', {
      q: filters.q,
      type: csv(filters.types),
      work_model: csv(filters.workModels),
      locations: csv(filters.locations),
      category: csv(filters.categories),
      company_slug: filters.companySlug,
      ids: csv(filters.ids),
      sort: filters.sort,
      dir: filters.sort === 'title' ? 'ASC' : 'DESC',
      limit,
      offset: pageToOffset(filters.page ?? 1, limit),
    });
    const container = isRecord(data) ? data : {};
    return toPaginated(records(container.data).map(toJobSummary), container.pagination, limit);
  }

  async getBySlug(slug: string): Promise<JobDetail | null> {
    try {
      const data = await this.http.get<unknown>('jobs/get', { slug });
      return isRecord(data) ? toJobDetail(data) : null;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
      throw error;
    }
  }

  async recommended(limit: number): Promise<JobSummary[]> {
    const data = await this.http.get<unknown>('jobs/recommended', { limit });
    return records(isRecord(data) ? data.jobs : []).map(toJobSummary);
  }
}
