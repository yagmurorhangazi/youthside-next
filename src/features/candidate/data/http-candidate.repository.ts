/**
 * [MODÜL: HTTP ADAY REPOSITORY]
 * Amaç: `CandidateRepository` sözleşmesini Youthside API ile gerçeklemek.
 * Uçlar: auth/me · candidates/profile-completeness · candidates/update · candidates/upload-avatar
 *        candidates/upload-resume · applications/my-list · applications/check · applications/create
 *        registrations/my-events · registrations/check · registrations/create · registrations/quick-register
 */

import type { HttpClient } from '@/shared/api/http-client';
import { pageToOffset, toPaginated, type Paginated } from '@/shared/api/pagination';
import { apiDate, bool, isRecord, num, records, str, type UnknownRecord } from '@/shared/api/parse';
import {
  GENDERS,
  type ApplicationStatusFilter,
  type ApplyInput,
  type CandidateProfile,
  type CandidateProfileInput,
  type CandidateRepository,
  type Gender,
  type MyApplication,
  type MyEventRegistration,
  type ProfileCompleteness,
  type QuickRegisterInput,
} from '../types';

const DEFAULT_LIMIT = 10;

/** "Ayşe Nur Yılmaz" → { first: "Ayşe Nur", last: "Yılmaz" } (API yalnızca tam ad döndürüyor). */
function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return { first: parts[0] ?? '', last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

export function toCompleteness(raw: unknown): ProfileCompleteness {
  const data: UnknownRecord = isRecord(raw) ? raw : {};
  return {
    percentage: num(data.percentage) ?? 0,
    isEligible: bool(data.is_eligible),
    threshold: num(data.threshold) ?? 75,
    missingFields: records(data.missing_fields).map((item) => ({
      field: str(item.field) ?? '',
      label: str(item.label) ?? '',
      weight: num(item.weight) ?? 0,
    })),
  };
}

function toProfile(user: UnknownRecord): CandidateProfile {
  const profile = isRecord(user.profile) ? user.profile : {};
  const socials = isRecord(profile.socials) ? profile.socials : {};
  const fullName = str(user.name) ?? '';
  const { first, last } = splitName(fullName);
  const gender = str(profile.gender);
  return {
    id: str(user.id) ?? '',
    firstName: str(profile.first_name) ?? first,
    lastName: str(profile.last_name) ?? last,
    fullName,
    email: str(user.email) ?? '',
    phone: str(profile.phone),
    gender: gender && (GENDERS as readonly string[]).includes(gender) ? (gender as Gender) : null,
    university: str(profile.university),
    department: str(profile.department),
    grade: str(profile.grade),
    graduationYear: num(profile.graduation_year),
    avatarUrl: str(profile.avatar_url) ?? str(user.avatar_url),
    resumeUrl: str(profile.resume_url),
    linkedinUrl: str(socials.linkedin),
    githubUrl: str(socials.github),
  };
}

function toApplication(raw: UnknownRecord): MyApplication {
  return {
    id: str(raw.application_id) ?? '',
    appliedAt: apiDate(raw.created_at),
    updatedAt: apiDate(raw.updated_at),
    jobTitle: str(raw.job_title) ?? 'İlan',
    jobSlug: str(raw.job_slug) ?? '',
    jobStatus: str(raw.job_status),
    jobType: str(raw.job_type),
    workModel: str(raw.work_model),
    imageUrl: str(raw.job_image_url),
    companyName: str(raw.company_name) ?? 'Şirket',
    companyLogo: str(raw.company_logo),
  };
}

function toRegistration(raw: UnknownRecord): MyEventRegistration {
  return {
    id: str(raw.registration_id) ?? '',
    status: str(raw.registration_status),
    registeredAt: apiDate(raw.registered_at),
    eventTitle: str(raw.event_title) ?? 'Etkinlik',
    eventSlug: str(raw.event_slug) ?? '',
    eventType: str(raw.event_type),
    startDate: apiDate(raw.start_date),
    imageUrl: str(raw.cover_image_url),
    companyName: str(raw.company_name) ?? 'Şirket',
    companyLogo: str(raw.company_logo),
  };
}

/** Formdan gelen boş metni API'nin "temizle" anlamına gelen boş string'i olarak bırakır. */
const clean = (value: string) => value.trim();

export class HttpCandidateRepository implements CandidateRepository {
  constructor(private readonly http: HttpClient) {}

  async getProfile(): Promise<CandidateProfile> {
    const data = await this.http.get<UnknownRecord>('auth/me');
    return toProfile(isRecord(data?.user) ? data.user : {});
  }

  async getCompleteness(): Promise<ProfileCompleteness> {
    return toCompleteness(await this.http.get<unknown>('candidates/profile-completeness'));
  }

  async updateProfile(input: CandidateProfileInput): Promise<ProfileCompleteness | null> {
    const year = Number(input.graduationYear);
    const data = await this.http.post<UnknownRecord>('candidates/update', {
      first_name: clean(input.firstName),
      last_name: clean(input.lastName),
      phone: clean(input.phone),
      gender: clean(input.gender),
      university: clean(input.university),
      department: clean(input.department),
      grade: clean(input.grade),
      graduation_year: Number.isInteger(year) && year > 1950 ? year : '',
      socials: { linkedin: clean(input.linkedinUrl), github: clean(input.githubUrl) },
    });
    return isRecord(data?.completeness) ? toCompleteness(data.completeness) : null;
  }

  async uploadAvatar(file: File): Promise<string> {
    const form = new FormData();
    form.append('avatar', file);
    const data = await this.http.postForm<UnknownRecord>('candidates/upload-avatar', form);
    return str(data?.avatar_url) ?? '';
  }

  async uploadResume(file: File): Promise<string> {
    const form = new FormData();
    form.append('resume', file);
    const data = await this.http.postForm<UnknownRecord>('candidates/upload-resume', form);
    return str(data?.resume_url) ?? '';
  }

  async myApplications(filter: ApplicationStatusFilter, page: number, limit = DEFAULT_LIMIT): Promise<Paginated<MyApplication>> {
    const data = await this.http.get<UnknownRecord>('applications/my-list', {
      status_filter: filter,
      limit,
      offset: pageToOffset(page, limit),
      dir: 'DESC',
    });
    return toPaginated(records(data?.applications).map(toApplication), data?.pagination, limit);
  }

  async myEvents(page: number, limit = DEFAULT_LIMIT): Promise<Paginated<MyEventRegistration>> {
    const data = await this.http.get<UnknownRecord>('registrations/my-events', {
      limit,
      offset: pageToOffset(page, limit),
      dir: 'DESC',
    });
    return toPaginated(records(data?.events).map(toRegistration), data?.pagination, limit);
  }

  async hasApplied(jobId: string): Promise<boolean> {
    const data = await this.http.get<UnknownRecord>('applications/check', { job_id: jobId });
    return bool(data?.has_applied);
  }

  async apply(input: ApplyInput): Promise<void> {
    await this.http.post('applications/create', {
      job_id: input.jobId,
      cover_letter: input.coverLetter || undefined,
      accepted_contracts: input.acceptedContracts,
      answers: input.answers.map(({ questionId, answer }) => ({ question_id: questionId, answer })),
    });
  }

  async isRegistered(eventId: string): Promise<boolean> {
    const data = await this.http.get<UnknownRecord>('registrations/check', { event_id: eventId });
    return bool(data?.is_registered);
  }

  async registerEvent(eventId: string, acceptedContracts: readonly string[]): Promise<void> {
    await this.http.post('registrations/create', { event_id: eventId, accepted_contracts: acceptedContracts });
  }

  async quickRegister(input: QuickRegisterInput): Promise<{ isNewAccount: boolean }> {
    const data = await this.http.post<UnknownRecord>('registrations/quick-register', {
      event_id: input.eventId,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone || undefined,
      university: input.university || undefined,
      department: input.department || undefined,
      grade: input.grade || undefined,
      accepted_contracts: input.acceptedContracts,
      // Bot tuzağı: formdaki gizli alan olduğu gibi iletilir; doluysa API sahte başarı döner.
      _hp_field: input.honeypot ?? '',
    });
    return { isNewAccount: bool(data?.is_new_account) };
  }
}
