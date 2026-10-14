/**
 * [MODÜL: ADAY DOMAIN TİPLERİ]
 * Amaç: Aday profili, profil doluluğu, başvurular ve etkinlik kayıtları için veri sözleşmeleri.
 */

import type { Paginated } from '@/shared/api/pagination';

export type Gender = 'Kadın' | 'Erkek' | 'Belirtmek İstemiyorum';
export const GENDERS: readonly Gender[] = ['Kadın', 'Erkek', 'Belirtmek İstemiyorum'];

export interface CandidateProfile {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string | null;
  readonly gender: Gender | null;
  readonly university: string | null;
  readonly department: string | null;
  readonly grade: string | null;
  readonly graduationYear: number | null;
  readonly avatarUrl: string | null;
  readonly resumeUrl: string | null;
  readonly linkedinUrl: string | null;
  readonly githubUrl: string | null;
}

/** `candidates/update` ile gönderilebilen alanlar (e-posta ve şifre hariç — API engelliyor). */
export interface CandidateProfileInput {
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
  readonly gender: string;
  readonly university: string;
  readonly department: string;
  readonly grade: string;
  readonly graduationYear: string;
  readonly linkedinUrl: string;
  readonly githubUrl: string;
}

export interface MissingField {
  readonly field: string;
  readonly label: string;
  readonly weight: number;
}

/** Başvuru için profilin en az %75 dolu olması gerekir (API kuralı). */
export interface ProfileCompleteness {
  readonly percentage: number;
  readonly isEligible: boolean;
  readonly threshold: number;
  readonly missingFields: readonly MissingField[];
}

/**
 * Otomatik üretilen CV'nin kaydı (oturumda). Profil kaydında CV yalnızca hiç yoksa veya mevcut CV
 * bu adresle aynıysa (yani daha önce otomatik üretilmişse) yeniden üretilir; elle yüklenen CV ezilmez.
 * Not: API `resume_source` alanı sunarsa bu kayıt kaldırılır (bkz. plan → API önerisi B).
 */
export interface ResumeOrigin {
  readonly url: string;
  readonly source: 'auto';
}

/** Otomatik CV şablonunun ihtiyaç duyduğu profil alanları. */
export interface ResumeData {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string | null;
  readonly university: string | null;
  readonly department: string | null;
  readonly grade: string | null;
  readonly graduationYear: string | null;
  readonly linkedinUrl: string | null;
  readonly githubUrl: string | null;
}

export interface MyApplication {
  readonly id: string;
  readonly appliedAt: string | null;
  readonly updatedAt: string | null;
  readonly jobTitle: string;
  readonly jobSlug: string;
  readonly jobStatus: string | null;
  readonly jobType: string | null;
  readonly workModel: string | null;
  readonly imageUrl: string | null;
  readonly companyName: string;
  readonly companyLogo: string | null;
}

export interface MyEventRegistration {
  readonly id: string;
  /** KAYITLI · KATILDI · KATILMADI · IPTAL */
  readonly status: string | null;
  readonly registeredAt: string | null;
  readonly eventTitle: string;
  readonly eventSlug: string;
  readonly eventType: string | null;
  readonly startDate: string | null;
  readonly imageUrl: string | null;
  readonly companyName: string;
  readonly companyLogo: string | null;
}

export type ApplicationStatusFilter = 'active' | 'past';

export interface ApplyInput {
  readonly jobId: string;
  readonly coverLetter?: string;
  readonly acceptedContracts: readonly string[];
  readonly answers: readonly { readonly questionId: string; readonly answer: string | readonly string[] }[];
}

export interface QuickRegisterInput {
  readonly eventId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone?: string;
  readonly university?: string;
  readonly department?: string;
  readonly grade?: string;
  readonly acceptedContracts: readonly string[];
  /** Gizli bot tuzağı alanının değeri — gerçek kullanıcıda her zaman boştur. */
  readonly honeypot?: string;
}

/** Dosya yükleme sonucu: CDN adresi + API'nin hesapladığı yeni doluluk (popup eşiği için). */
export interface UploadResult {
  readonly url: string;
  readonly completeness: ProfileCompleteness | null;
}

/** Aday işlemleri sözleşmesi (Dependency Inversion). Tüm metotlar aday token'ı gerektirir (quickRegister hariç). */
export interface CandidateRepository {
  getProfile(): Promise<CandidateProfile>;
  getCompleteness(): Promise<ProfileCompleteness>;
  updateProfile(input: CandidateProfileInput): Promise<ProfileCompleteness | null>;
  uploadAvatar(file: File): Promise<UploadResult>;
  uploadResume(file: File): Promise<UploadResult>;
  myApplications(filter: ApplicationStatusFilter, page: number, limit?: number): Promise<Paginated<MyApplication>>;
  myEvents(page: number, limit?: number): Promise<Paginated<MyEventRegistration>>;
  hasApplied(jobId: string): Promise<boolean>;
  apply(input: ApplyInput): Promise<void>;
  isRegistered(eventId: string): Promise<boolean>;
  registerEvent(eventId: string, acceptedContracts: readonly string[]): Promise<void>;
  quickRegister(input: QuickRegisterInput): Promise<{ isNewAccount: boolean }>;
}
