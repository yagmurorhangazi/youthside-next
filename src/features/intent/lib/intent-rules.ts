/**
 * [MODÜL: BEKLEYEN NİYET KURALLARI]
 * Amaç: Niyetin ömrü, bir sonraki adımı ve giriş sonrası yönlendirmesine karar vermek.
 *
 * Neden ayrı ve saf: Senaryoların tamamı (misafir, profil eksik, zaten başvurmuş, süresi dolmuş,
 * zorunlu sözleşme var...) tek tabloda çözülür. Adım kararı mevcut `resolveApplyState` /
 * `resolveRegistrationState` sonuçlarından türetilir; aynı kural ikinci kez yazılmaz (DRY).
 * Referans: youthside-2026-ui/giris-yap → redirectAfterCandidateLogin, profilim → openReturnToJobModal
 */

import { ROUTES } from '@/config/site';
import type { Contract } from '@/features/common/types';
import type { RegistrationState } from '@/features/events/lib/registration-state';
import type { ApplyState } from '@/features/jobs/lib/apply-state';
import type { JobQuestion } from '@/features/jobs/types';
import type { IntentStep, PendingIntent } from '../types';

/** Niyet 24 saat yaşar; sonra kendiliğinden düşer (oturum TTL'i de aynıdır). */
export const INTENT_TTL_SECONDS = 24 * 60 * 60;
/** Engel yoksa popup bu kadar saniye sonra kendisi gönderir. */
export const AUTO_CONFIRM_SECONDS = 5;

export function isIntentExpired(intent: Pick<PendingIntent, 'createdAt'>, now = Date.now()): boolean {
  return now - intent.createdAt > INTENT_TTL_SECONDS * 1000;
}

/** Niyetin oturumda kalan ömrü (saniye) — anahtar bazlı TTL için. */
export function remainingTtlSeconds(intent: Pick<PendingIntent, 'createdAt'>, now = Date.now()): number {
  return Math.max(1, Math.ceil(INTENT_TTL_SECONDS - (now - intent.createdAt) / 1000));
}

/**
 * Zorunlu soru veya sözleşme varsa kullanıcının açık onayı gerekir; otomatik gönderilmez.
 * Neden: Sözleşmeyi kullanıcı adına kabul etmek KVKK açık rıza ilkesine aykırıdır.
 */
export function requiresUserInput(questions: readonly Pick<JobQuestion, 'isRequired'>[], contracts: readonly Pick<Contract, 'isRequired'>[]): boolean {
  return questions.some((question) => question.isRequired) || contracts.some((contract) => contract.isRequired);
}

const confirmStep = (requiresInput: boolean): IntentStep => (requiresInput ? 'confirm_manual' : 'confirm_auto');

export function stepFromApplyState(state: ApplyState, requiresInput: boolean): IntentStep {
  switch (state) {
    case 'guest':
      return 'login';
    case 'applied':
      return 'done';
    case 'incomplete':
      return 'complete_profile';
    case 'ready':
      return confirmStep(requiresInput);
    default:
      return 'closed'; // expired · external
  }
}

export function stepFromRegistrationState(state: RegistrationState, requiresInput: boolean): IntentStep {
  switch (state) {
    case 'guest':
      return 'login';
    case 'registered':
      return 'done';
    case 'ready':
      return confirmStep(requiresInput);
    default:
      return 'closed'; // ended · external · full
  }
}

/**
 * Giriş sonrası nereye gidilecek?
 *   - Niyet yok → istenen adres (mevcut `?redirect=` davranışı)
 *   - Kullanıcı niyetle ilgisiz bir sayfadan girdiyse (ör. /sirketler) → o sayfa; hatırlatmayı global
 *     şerit/popup yapar, kullanıcı istemediği yere taşınmaz
 *   - İlan niyeti + profil yetersiz → profilim (orada tamamlayınca popup açılır)
 *   - Aksi halde niyetin sayfası (popup orada açılır)
 */
export function postLoginRedirect(intent: Pick<PendingIntent, 'kind' | 'path'> | null, profileEligible: boolean | null, requested: string): string {
  if (!intent) return requested;
  const requestedPath = requested.split('?')[0];
  if (requested !== ROUTES.dashboard && requestedPath !== intent.path) return requested;
  if (intent.kind === 'job' && profileEligible === false) return ROUTES.profile;
  return intent.path;
}

/** Bir sayfanın niyeti yeniden kurması için eklenen işaret (`?devam=1`) — cihazlar arası yedek yol. */
export const RESUME_PARAM = 'devam';

export function withResumeFlag(path: string): string {
  return `${path}${path.includes('?') ? '&' : '?'}${RESUME_PARAM}=1`;
}
