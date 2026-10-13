/**
 * [MODÜL: ETKİNLİK DOMAIN TİPLERİ]
 * Amaç: UI'ın kullandığı etkinlik veri sözleşmeleri ve repository arayüzü (API alan adlarından bağımsız).
 */

import type { Paginated } from '@/shared/api/pagination';
import type { CompanyRef, Contract } from '../common/types';

export type EventLocationType = 'Online' | 'Fiziksel' | 'Hibrit';

export interface EventSummary {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  /** "Zirve", "Eğitim", "Webinar" vb. */
  readonly type: string | null;
  readonly locationType: EventLocationType | null;
  readonly city: string | null;
  /** Serbest metin adres (iframe kodu ise null'a çekilir, `mapEmbedUrl`'e taşınır). */
  readonly location: string | null;
  readonly imageUrl: string | null;
  /** ISO (+03:00) */
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly quota: number | null;
  readonly isPinned: boolean;
  readonly company: CompanyRef;
}

export interface EventSpeaker {
  readonly id: string;
  readonly name: string;
  readonly role: string | null;
  readonly imageUrl: string | null;
  readonly linkedinUrl: string | null;
  readonly companyName: string | null;
}

export interface EventSession {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  /** "10:00" gibi metin; API saat veya tarih-saat döndürebilir. */
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly speakers: readonly EventSpeaker[];
}

export interface EventDetail extends EventSummary {
  readonly descriptionHtml: string;
  /** Google Maps embed adresi (yalnızca güvenli google.com/maps src'si). */
  readonly mapEmbedUrl: string | null;
  /** Online etkinlik bağlantısı veya harita linki. */
  readonly locationLink: string | null;
  readonly registrationCount: number;
  /** null = sınırsız */
  readonly remainingQuota: number | null;
  readonly externalApplicationUrl: string | null;
  readonly program: readonly EventSession[];
  readonly speakers: readonly EventSpeaker[];
  readonly contracts: readonly Contract[];
}

export type EventSort = 'start_date' | 'created_at' | 'view_count';

export interface EventListFilters {
  readonly q?: string;
  readonly locationTypes?: readonly EventLocationType[];
  readonly cities?: readonly string[];
  readonly companyId?: string;
  /** true → yalnızca bitmemiş etkinlikler (varsayılan vitrin davranışı). */
  readonly activeOnly?: boolean;
  readonly sort?: EventSort;
  readonly page?: number;
  readonly limit?: number;
}

/** Etkinlik verisine erişim sözleşmesi (Dependency Inversion). */
export interface EventRepository {
  list(filters?: EventListFilters): Promise<Paginated<EventSummary>>;
  getBySlug(slug: string): Promise<EventDetail | null>;
}
