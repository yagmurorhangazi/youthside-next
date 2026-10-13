/**
 * [MODÜL: ORTAK MAPPER'LAR]
 * Amaç: Ortak domain tiplerini API yanıtından üretmek (ilan ve etkinlik mapper'ları paylaşır).
 */

import { bool, isRecord, records, str, type UnknownRecord } from '@/shared/api/parse';
import type { CompanyRef, Contract } from './types';

/** İç içe `company{}` nesnesinden veya düz `company_*` alanlarından şirket özeti üretir. */
export function toCompanyRef(raw: UnknownRecord): CompanyRef {
  const nested = isRecord(raw.company) ? raw.company : null;
  if (nested) {
    return {
      id: str(nested.id) ?? str(raw.company_id) ?? '',
      name: str(nested.name) ?? 'Şirket',
      slug: str(nested.slug) ?? '',
      logoUrl: str(nested.logo_url) ?? str(nested.logo),
    };
  }
  return {
    id: str(raw.company_id) ?? '',
    name: str(raw.company_name) ?? 'Şirket',
    slug: str(raw.company_slug) ?? '',
    logoUrl: str(raw.company_logo) ?? str(raw.company_logo_url),
  };
}

export function toContracts(value: unknown): Contract[] {
  return records(value)
    .map((item) => ({
      id: str(item.id) ?? '',
      title: str(item.title) ?? 'Sözleşme',
      fileUrl: str(item.file_url),
      isRequired: bool(item.is_required),
    }))
    .filter((contract) => contract.id !== '');
}
