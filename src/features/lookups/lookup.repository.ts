/**
 * [MODÜL: SABİT VERİLER (LOOKUP) REPOSITORY]
 * Amaç: Filtre ve form seçeneklerini (şehir, çalışma tipi, üniversite, sınıf...) API'den almak.
 * Uçlar (hepsi 🌐): data/job-types · data/work-models · data/departments · data/universities
 *                  · data/departmens (üniversite bölümleri) · data/class · locations/tr_cities
 *
 * Performans: Bu listeler nadiren değişir; sunucu belleğinde 1 saat tutulur ve eş zamanlı
 * istekler tek çağrıya indirilir (`cached`). Hata olursa boş liste döner, sayfa çökmez.
 */

import type { HttpClient } from '@/shared/api/http-client';
import { records, str, strings } from '@/shared/api/parse';
import { cached, ONE_HOUR } from '@/shared/lib/cache';

export interface LookupRepository {
  jobTypes(): Promise<string[]>;
  workModels(): Promise<string[]>;
  jobCategories(): Promise<string[]>;
  cities(): Promise<string[]>;
  universities(): Promise<string[]>;
  universityDepartments(): Promise<string[]>;
  classes(): Promise<string[]>;
}

/** Türkçe alfabeye göre sıralama (İ, Ş, Ç doğru yerde). */
const sortTr = (items: string[]) => [...new Set(items)].sort((a, b) => a.localeCompare(b, 'tr-TR'));

export class HttpLookupRepository implements LookupRepository {
  constructor(private readonly http: HttpClient) {}

  /** `[{ value }]` biçimindeki listeyi okur; hata durumunda boş liste. */
  private values(path: string, { sort = false } = {}): Promise<string[]> {
    return cached(`lookup:${path}`, ONE_HOUR, async () => {
      const items = records(await this.http.get<unknown>(path))
        .map((item) => str(item.value))
        .filter((value): value is string => value !== null);
      return sort ? sortTr(items) : items;
    }).catch((error: unknown) => {
      console.error(`[LOOKUP] ${path} alınamadı:`, error);
      return [];
    });
  }

  jobTypes() {
    return this.values('data/job-types');
  }

  workModels() {
    return this.values('data/work-models');
  }

  jobCategories() {
    return this.values('data/departments', { sort: true });
  }

  universities() {
    return this.values('data/universities', { sort: true });
  }

  universityDepartments() {
    return this.values('data/departmens', { sort: true });
  }

  /** Sınıf listesi API'nin verdiği mantıksal sırada kalır (Hazırlık → Doktora). */
  classes() {
    return this.values('data/class');
  }

  cities(): Promise<string[]> {
    return cached('lookup:cities', ONE_HOUR, async () => sortTr(strings(await this.http.get<unknown>('locations/tr_cities')))).catch(
      (error: unknown) => {
        console.error('[LOOKUP] şehirler alınamadı:', error);
        return [];
      },
    );
  }
}
