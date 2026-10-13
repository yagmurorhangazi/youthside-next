/**
 * [MODÜL: İLAN DOMAIN TİPLERİ]
 * Amaç: UI'ın kullandığı ilan veri sözleşmeleri ve repository arayüzü.
 *
 * Neden API yanıtından ayrı: Bileşenler API'nin snake_case alan adlarına bağımlı olmaz.
 * API yanıtı `mappers.ts` içinde bu modele çevrilir; API değişirse yalnızca mapper değişir.
 */

import type { Paginated } from '@/shared/api/pagination';
import type { CompanyRef, Contract } from '../common/types';

export interface JobSummary {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  /** HTML'siz kısa açıklama. */
  readonly excerpt: string;
  /** "Staj", "Tam Zamanlı" vb. */
  readonly type: string | null;
  /** "Ofis", "Hibrit", "Uzaktan" */
  readonly workModel: string | null;
  readonly category: string | null;
  readonly locations: readonly string[];
  readonly coverImageUrl: string | null;
  /** ISO (+03:00) */
  readonly publishDate: string | null;
  readonly expirationDate: string | null;
  readonly isFeatured: boolean;
  readonly isPinned: boolean;
  readonly company: CompanyRef & { readonly employeeRange: string | null };
}

export type JobQuestionType = 'text' | 'long_text' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'video' | 'file';

/** Başvuru formundaki ön eleme sorusu. */
export interface JobQuestion {
  readonly id: string;
  readonly text: string;
  readonly type: JobQuestionType;
  readonly options: readonly string[];
  readonly isRequired: boolean;
}

export interface JobDetail extends JobSummary {
  /** Temizlenmiş (sanitize) HTML. */
  readonly descriptionHtml: string;
  readonly companySector: string | null;
  /** Başvuru şirketin kendi sitesinde alınıyorsa dolu. */
  readonly externalApplicationUrl: string | null;
  readonly questions: readonly JobQuestion[];
  readonly contracts: readonly Contract[];
}

export type JobSort = 'publish_date' | 'view_count' | 'title';

export interface JobListFilters {
  readonly q?: string;
  readonly types?: readonly string[];
  readonly workModels?: readonly string[];
  readonly locations?: readonly string[];
  readonly categories?: readonly string[];
  readonly companySlug?: string;
  readonly ids?: readonly string[];
  readonly sort?: JobSort;
  readonly page?: number;
  readonly limit?: number;
}

/**
 * İlan verisine erişim sözleşmesi (Dependency Inversion).
 * Sayfalar bu arayüze bağımlıdır; implementasyon `src/core/repositories.ts`'de seçilir.
 */
export interface JobRepository {
  list(filters?: JobListFilters): Promise<Paginated<JobSummary>>;
  /** Bulunamazsa null (404 sayfası için). */
  getBySlug(slug: string): Promise<JobDetail | null>;
  /** Giriş yapmış adaya profiline göre önerilen ilanlar. */
  recommended(limit: number): Promise<JobSummary[]>;
}
