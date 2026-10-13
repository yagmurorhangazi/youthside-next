/**
 * [MODÜL: ŞİRKET / KULÜP DOMAIN TİPLERİ]
 * Amaç: Şirket ve kulüp listeleri ile profil sayfalarının veri sözleşmeleri.
 * Not: API'de şirket ve kulüp aynı tablodadır (`type`). Kulüpler yalnızca etkinlik düzenler.
 */

import type { Paginated } from '@/shared/api/pagination';

export type OrganizationType = 'company' | 'club';

export type SocialPlatform = 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'youtube' | 'tiktok';

export interface SocialLink {
  readonly platform: SocialPlatform;
  readonly url: string;
}

export interface CompanySummary {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly type: OrganizationType;
  readonly logoUrl: string | null;
  readonly coverImageUrl: string | null;
  readonly sector: string | null;
  readonly employeeRange: string | null;
  /** Yalnızca kulüplerde dolu. */
  readonly university: string | null;
  /** HTML'siz kısa tanıtım. */
  readonly about: string;
  readonly isVerified: boolean;
  readonly socials: readonly SocialLink[];
  readonly jobsCount: number;
  readonly eventsCount: number;
}

export interface CompanyAddress {
  readonly title: string | null;
  readonly address: string | null;
  readonly mapEmbedUrl: string | null;
}

export interface CompanyProfile extends Omit<CompanySummary, 'about' | 'jobsCount' | 'eventsCount'> {
  readonly aboutHtml: string;
  readonly aboutText: string;
  readonly website: string | null;
  readonly addresses: readonly CompanyAddress[];
  /** Pasif şirket/kulüp vitrinde gösterilmez (get_by_slug `is_active`). */
  readonly isActive: boolean;
}

export interface CultureBlock {
  readonly id: string;
  readonly title: string | null;
  readonly contentHtml: string;
  readonly mediaType: 'image' | 'video' | 'youtube' | null;
  /** youtube ise embed adresine çevrilmiş halidir. */
  readonly mediaUrl: string | null;
}

export interface Award {
  readonly id: string;
  readonly title: string;
  /** HTML'siz metin (kart önizlemesi). */
  readonly description: string | null;
  /** Temizlenmiş zengin metin (detay penceresi). */
  readonly contentHtml: string;
  readonly imageUrl: string | null;
  readonly year: number | null;
  readonly givenBy: string | null;
}

export interface GalleryItem {
  readonly id: string;
  readonly imageUrl: string;
  readonly title: string | null;
}

export type CompanySort = 'created_at' | 'name' | 'jobs_count' | 'events_count';

export interface CompanyListFilters {
  readonly type: OrganizationType;
  readonly q?: string;
  readonly sector?: string;
  readonly sort?: CompanySort;
  readonly page?: number;
  readonly limit?: number;
}

/** Şirket/kulüp verisine erişim sözleşmesi (Dependency Inversion). */
export interface CompanyRepository {
  list(filters: CompanyListFilters): Promise<Paginated<CompanySummary>>;
  getBySlug(slug: string): Promise<CompanyProfile | null>;
  getCultureBlocks(slug: string): Promise<CultureBlock[]>;
  getAwards(slug: string): Promise<Award[]>;
  getGallery(slug: string): Promise<GalleryItem[]>;
}
