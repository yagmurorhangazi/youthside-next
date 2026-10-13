/**
 * [MODÜL: PROFİL SAYFASI VERİ YÜKLEYİCİ]
 * Amaç: Şirket/kulüp profilinin tüm sekmelerinde ortak olan veriyi (profil + sekme sayaçları)
 *       tek fonksiyonda, paralel isteklerle yüklemek. Her sekme sayfası bunu çağırır (DRY).
 *
 * Profil bulunamazsa null döner → sayfa 404 gösterir. Yardımcı istekler hata verirse
 * sayaç 0 kabul edilir; profil yine açılır.
 */

import type { Services } from '@/core/services';
import { createSafeLoader } from '@/core/safe';
import type { Award, CompanyProfile, GalleryItem } from '../types';

/** Profil sayfasındaki sekmeler. */
export type ProfileTab = 'overview' | 'jobs' | 'events' | 'awards' | 'photos' | 'locations';

export interface ProfileContext {
  readonly profile: CompanyProfile;
  readonly awards: Award[];
  readonly gallery: GalleryItem[];
  readonly counts: {
    readonly jobs: number;
    readonly events: number;
    readonly awards: number;
    readonly photos: number;
    readonly locations: number;
  };
}

export async function loadProfileContext(services: Services, slug: string): Promise<ProfileContext | null> {
  const profile = await services.companies.getBySlug(slug);
  // Pasif şirket/kulüp profili bulunamamış gibi davranır → 404 (referans: 9253aff, `c.is_active = 1`).
  if (!profile || !profile.isActive) return null;

  const safe = createSafeLoader(`PROFIL:${slug}`);
  const isClub = profile.type === 'club';

  const [jobs, events, awards, gallery] = await Promise.all([
    isClub ? Promise.resolve(null) : safe(services.jobs.list({ companySlug: slug, limit: 1 }), 'İlan sayısı'),
    safe(services.events.list({ companyId: profile.id, activeOnly: true, limit: 1 }), 'Etkinlik sayısı'),
    safe(services.companies.getAwards(slug), 'Ödüller'),
    safe(services.companies.getGallery(slug), 'Galeri'),
  ]);

  return {
    profile,
    awards: awards ?? [],
    gallery: gallery ?? [],
    counts: {
      jobs: jobs?.total ?? 0,
      events: events?.total ?? 0,
      awards: awards?.length ?? 0,
      photos: gallery?.length ?? 0,
      // Adresler get_by_slug yanıtında gelir; ek istek gerekmez.
      locations: profile.addresses.length,
    },
  };
}
