/**
 * [MODÜL: HTTP ŞİRKET REPOSITORY]
 * Amaç: `CompanyRepository` sözleşmesini Youthside API ile gerçeklemek.
 * Uçlar (hepsi 🌐): companies/list · companies/get_by_slug · get_culture_blocks · get_award_blocks · get_gallery_items
 */

import { ApiError } from '@/shared/api/errors';
import type { HttpClient } from '@/shared/api/http-client';
import { pageToOffset, toPaginated, type Paginated } from '@/shared/api/pagination';
import { isRecord, records } from '@/shared/api/parse';
import type { Award, CompanyListFilters, CompanyProfile, CompanyRepository, CompanySummary, CultureBlock, GalleryItem } from '../types';
import { toAward, toCompanyProfile, toCompanySummary, toCultureBlock, toGalleryItem } from './company.mappers';

const DEFAULT_LIMIT = 12;

export class HttpCompanyRepository implements CompanyRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filters: CompanyListFilters): Promise<Paginated<CompanySummary>> {
    const limit = filters.limit ?? DEFAULT_LIMIT;
    const sort = filters.sort ?? 'created_at';
    const data = await this.http.get<unknown>('companies/list', {
      type: filters.type,
      q: filters.q,
      sector: filters.sector,
      sort,
      dir: sort === 'name' ? 'ASC' : 'DESC',
      limit,
      offset: pageToOffset(filters.page ?? 1, limit),
    });
    const container = isRecord(data) ? data : {};
    return toPaginated(records(container.data).map(toCompanySummary), container.meta, limit);
  }

  async getBySlug(slug: string): Promise<CompanyProfile | null> {
    try {
      const data = await this.http.get<unknown>('companies/get_by_slug', { slug });
      return isRecord(data) && data.id ? toCompanyProfile(data) : null;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
      throw error;
    }
  }

  async getCultureBlocks(slug: string): Promise<CultureBlock[]> {
    return records(await this.http.get<unknown>('companies/get_culture_blocks', { slug })).map(toCultureBlock);
  }

  async getAwards(slug: string): Promise<Award[]> {
    return records(await this.http.get<unknown>('companies/get_award_blocks', { slug })).map(toAward);
  }

  async getGallery(slug: string): Promise<GalleryItem[]> {
    return records(await this.http.get<unknown>('companies/get_gallery_items', { slug }))
      .map(toGalleryItem)
      .filter((item): item is GalleryItem => item !== null);
  }
}
