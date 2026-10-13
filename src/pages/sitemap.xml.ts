/**
 * [MODÜL: DİNAMİK SITEMAP]
 * Amaç: Arama motorlarına tüm yayındaki ilan, etkinlik, şirket ve kulüp sayfalarını bildirmek.
 * Veri canlı API'den istek anında üretilir ve 1 saat CDN/tarayıcı önbelleğinde tutulur.
 * Bir kaynak hata verirse o bölüm atlanır; sitemap yine üretilir.
 */

import type { APIRoute } from 'astro';
import { ROUTES, SITE } from '@/config/site';
import { createSafeLoader } from '@/core/safe';

const MAX_ITEMS = 100;

interface Entry {
  readonly path: string;
  readonly lastmod?: string | null;
  readonly priority: number;
}

const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = async ({ locals, site }) => {
  const base = site?.href ?? SITE.url;
  const { jobs, events, companies } = locals.services;
  const safe = createSafeLoader('SITEMAP');

  const [jobList, eventList, companyList, clubList] = await Promise.all([
    safe(jobs.list({ limit: MAX_ITEMS }), 'İlanlar'),
    safe(events.list({ activeOnly: true, limit: MAX_ITEMS }), 'Etkinlikler'),
    safe(companies.list({ type: 'company', limit: MAX_ITEMS }), 'Şirketler'),
    safe(companies.list({ type: 'club', limit: MAX_ITEMS }), 'Kulüpler'),
  ]);

  const entries: Entry[] = [
    { path: ROUTES.home, priority: 1 },
    { path: ROUTES.jobs, priority: 0.9 },
    { path: ROUTES.events, priority: 0.9 },
    { path: ROUTES.companies, priority: 0.8 },
    { path: ROUTES.clubs, priority: 0.7 },
    ...(jobList?.items ?? []).map((job) => ({ path: ROUTES.jobDetail(job.company.slug, job.slug), lastmod: job.publishDate, priority: 0.8 })),
    ...(eventList?.items ?? []).map((event) => ({ path: ROUTES.eventDetail(event.company.slug, event.slug), priority: 0.7 })),
    ...[...(companyList?.items ?? []), ...(clubList?.items ?? [])].map((company) => ({ path: ROUTES.company(company.slug), priority: 0.6 })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) =>
      `  <url><loc>${escapeXml(new URL(entry.path, base).href)}</loc>${entry.lastmod ? `<lastmod>${entry.lastmod.slice(0, 10)}</lastmod>` : ''}<priority>${entry.priority.toFixed(1)}</priority></url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};
