/**
 * [MODÜL: İLAN MAPPER'LARI]
 * Amaç: API'nin ilan yanıtlarını (jobs/list, jobs/get, jobs/recommended) domain modeline çevirmek.
 * Not: Üç uç aynı ilanı farklı alan adlarıyla döndürüyor (ör. `title` / `job_title`,
 *      iç içe `company{}` / düz `company_*`). Fark burada eritilir; UI tek model görür.
 */

import { apiDate, bool, isRecord, maybeJson, records, str, strings, type UnknownRecord } from '@/shared/api/parse';
import { sanitizeRichText, htmlToText } from '@/shared/lib/sanitize';
import { truncate } from '@/shared/lib/text';
import { toCompanyRef, toContracts } from '../../common/mappers';
import type { JobDetail, JobQuestion, JobQuestionType, JobSummary } from '../types';

const QUESTION_TYPES: readonly JobQuestionType[] = ['text', 'long_text', 'select', 'multiselect', 'radio', 'checkbox', 'video', 'file'];

export function toJobSummary(raw: UnknownRecord): JobSummary {
  const company = toCompanyRef(raw);
  const nestedCompany = isRecord(raw.company) ? raw.company : {};
  const excerpt = str(raw.excerpt) ?? htmlToText(str(raw.description));

  return {
    id: str(raw.id) ?? str(raw.job_id) ?? '',
    slug: str(raw.slug) ?? str(raw.job_slug) ?? '',
    title: str(raw.title) ?? str(raw.job_title) ?? 'İlan',
    excerpt: truncate(excerpt, 220),
    type: str(raw.type) ?? str(raw.job_type),
    workModel: str(raw.work_model),
    category: str(raw.category),
    locations: strings(raw.locations),
    coverImageUrl: str(raw.cover_image_url) ?? str(raw.job_image_url),
    publishDate: apiDate(raw.publish_date),
    expirationDate: apiDate(raw.expiration_date),
    isFeatured: bool(raw.is_featured),
    isPinned: bool(raw.is_pinned),
    company: {
      ...company,
      employeeRange: str(nestedCompany.employee_count_range) ?? str(raw.company_size),
    },
  };
}

/** Seçenekler `[{"text":"A"}]` JSON string'i, düz dizi veya virgüllü metin olabilir. */
function toOptions(value: unknown): string[] {
  const parsed = maybeJson(value);
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => (isRecord(item) ? str(item.text) ?? str(item.label) ?? str(item.value) : str(item)))
      .filter((item): item is string => item !== null);
  }
  return strings(parsed);
}

function toQuestion(raw: UnknownRecord): JobQuestion {
  const type = str(raw.type) as JobQuestionType | null;
  return {
    id: str(raw.id) ?? '',
    text: str(raw.text) ?? 'Soru',
    // Bilinmeyen tip gelirse kısa metin olarak sorulur; başvuru akışı kırılmaz.
    type: type && QUESTION_TYPES.includes(type) ? type : 'text',
    options: toOptions(raw.options),
    isRequired: bool(raw.is_required),
  };
}

export function toJobQuestions(value: unknown): JobQuestion[] {
  return records(value)
    .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0))
    .map(toQuestion)
    .filter((question) => question.id !== '');
}

export function toJobDetail(raw: UnknownRecord): JobDetail {
  const external = bool(raw.is_external_application) ? str(raw.external_application_url) : null;
  return {
    ...toJobSummary(raw),
    excerpt: truncate(htmlToText(str(raw.description)), 300),
    descriptionHtml: sanitizeRichText(str(raw.description)),
    companySector: str(raw.company_sector),
    externalApplicationUrl: external,
    questions: toJobQuestions(raw.questions),
    contracts: toContracts(raw.contracts),
  };
}
