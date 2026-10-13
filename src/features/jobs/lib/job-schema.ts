/**
 * [MODÜL: İLAN YAPILANDIRILMIŞ VERİSİ (JSON-LD)]
 * Amaç: Google for Jobs'un ilanı tanıyabilmesi için schema.org/JobPosting nesnesi üretmek.
 * Kaynak: https://developers.google.com/search/docs/appearance/structured-data/job-posting
 */

import { ROUTES, SITE } from '@/config/site';
import type { JobDetail } from '../types';

const EMPLOYMENT_TYPES: Record<string, string> = {
  Staj: 'INTERN',
  'Tam Zamanlı': 'FULL_TIME',
  'Yarı Zamanlı': 'PART_TIME',
  'Sözleşmeli': 'CONTRACTOR',
  'Dönemsel': 'TEMPORARY',
};

export function buildJobPostingSchema(job: JobDetail): Record<string, unknown> {
  const isRemote = job.workModel === 'Uzaktan';
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.descriptionHtml || job.excerpt,
    datePosted: job.publishDate ?? undefined,
    validThrough: job.expirationDate ?? undefined,
    employmentType: (job.type && EMPLOYMENT_TYPES[job.type]) || undefined,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company.name,
      sameAs: new URL(ROUTES.company(job.company.slug), SITE.url).href,
      logo: job.company.logoUrl ?? undefined,
    },
    ...(isRemote
      ? { jobLocationType: 'TELECOMMUTE', applicantLocationRequirements: { '@type': 'Country', name: 'Türkiye' } }
      : {
          jobLocation: (job.locations.length > 0 ? job.locations : ['Türkiye']).map((city) => ({
            '@type': 'Place',
            address: { '@type': 'PostalAddress', addressLocality: city, addressCountry: 'TR' },
          })),
        }),
    directApply: !job.externalApplicationUrl,
  };
}
