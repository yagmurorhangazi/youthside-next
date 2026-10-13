/**
 * [MODÜL: ŞİRKET MAPPER'LARI]
 * Amaç: companies/list, get_by_slug ve profil blok uçlarını domain modeline çevirmek.
 * Farklar: `socials` list'te dizi, get_by_slug'da JSON string; üniversite list'te
 * `university_name`, get_by_slug'da `university`. Burada tek modele indirilir.
 */

import { bool, num, records, str, type UnknownRecord } from '@/shared/api/parse';
import { htmlToText, sanitizeRichText } from '@/shared/lib/sanitize';
import { truncate } from '@/shared/lib/text';
import { extractMapEmbedUrl, toYoutubeEmbed } from '@/shared/lib/embed';
import type {
  Award,
  CompanyAddress,
  CompanyProfile,
  CompanySummary,
  CultureBlock,
  GalleryItem,
  SocialLink,
  SocialPlatform,
} from '../types';

const PLATFORMS: readonly SocialPlatform[] = ['linkedin', 'twitter', 'facebook', 'instagram', 'youtube'];

export function toSocials(value: unknown): SocialLink[] {
  return records(value)
    .map((item) => ({ platform: str(item.platform)?.toLowerCase() as SocialPlatform, url: str(item.url) ?? '' }))
    .filter((link) => PLATFORMS.includes(link.platform) && /^https?:\/\//i.test(link.url));
}

/** Kullanıcının girdiği site adresini "https://" ile tamamlar. */
function toWebsite(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

function base(raw: UnknownRecord) {
  return {
    id: str(raw.id) ?? '',
    slug: str(raw.slug) ?? '',
    name: str(raw.name) ?? 'Şirket',
    type: str(raw.type) === 'club' ? ('club' as const) : ('company' as const),
    logoUrl: str(raw.logo_url),
    coverImageUrl: str(raw.cover_image_url),
    sector: str(raw.sector),
    employeeRange: str(raw.employee_count_range),
    university: str(raw.university_name) ?? str(raw.university),
    isVerified: bool(raw.is_verified),
    socials: toSocials(raw.socials),
  };
}

export function toCompanySummary(raw: UnknownRecord): CompanySummary {
  return {
    ...base(raw),
    about: truncate(htmlToText(str(raw.about)), 180),
    jobsCount: num(raw.jobs_count) ?? 0,
    eventsCount: num(raw.events_count) ?? 0,
  };
}

function toAddresses(raw: UnknownRecord): CompanyAddress[] {
  const list = records(raw.addresses).map((item) => ({
    title: str(item.title),
    address: htmlToText(str(item.address)) || null,
    mapEmbedUrl: extractMapEmbedUrl(str(item.address_iframe)),
  }));
  return list.filter((item) => item.address || item.mapEmbedUrl);
}

export function toCompanyProfile(raw: UnknownRecord): CompanyProfile {
  const aboutHtml = sanitizeRichText(str(raw.about));
  return {
    ...base(raw),
    aboutHtml,
    aboutText: truncate(htmlToText(str(raw.about)), 300),
    website: toWebsite(raw.website),
    addresses: toAddresses(raw),
  };
}

export function toCultureBlock(raw: UnknownRecord): CultureBlock {
  const type = str(raw.mediaType);
  const url = str(raw.mediaUrl);
  const mediaType = type === 'image' || type === 'video' || type === 'youtube' ? type : null;
  return {
    id: str(raw.id) ?? '',
    title: str(raw.title),
    contentHtml: sanitizeRichText(str(raw.content)),
    mediaType,
    mediaUrl: mediaType === 'youtube' && url ? toYoutubeEmbed(url) : url,
  };
}

export function toAward(raw: UnknownRecord): Award {
  return {
    id: str(raw.id) ?? '',
    title: str(raw.title) ?? 'Ödül',
    description: htmlToText(str(raw.content)) || null,
    imageUrl: str(raw.mediaUrl),
    year: num(raw.year),
    givenBy: str(raw.givenBy),
  };
}

export function toGalleryItem(raw: UnknownRecord): GalleryItem | null {
  const imageUrl = str(raw.imageUrl);
  return imageUrl ? { id: str(raw.id) ?? imageUrl, imageUrl, title: str(raw.title) } : null;
}
