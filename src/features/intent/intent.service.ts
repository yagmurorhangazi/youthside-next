/**
 * [MODÜL: BEKLEYEN NİYET SERVİSİ — YALNIZCA SUNUCU]
 * Amaç: Niyeti yakalamak, durumunu çözmek (popup ne gösterecek?) ve tamamlanınca temizlemek.
 *
 * Neden servis: Action'lar ve sayfalar aynı akışı paylaşır (giriş, başvuru, `?devam=1`).
 * Başlık/şirket/görsel istemciden alınmaz; repository'den okunur (istemciye güvenilmez).
 * Durum kararı mevcut `resolveApplyState` / `resolveRegistrationState` ile verilir (DRY).
 * Referans: youthside-2026-ui/js/job-application-module.js + profilim → prepareReturnToJobApplication
 */

import { ROUTES } from '@/config/site';
import type { CandidateRepository, ProfileCompleteness } from '@/features/candidate/types';
import { resolveRegistrationState } from '@/features/events/lib/registration-state';
import type { EventRepository } from '@/features/events/types';
import { resolveApplyState } from '@/features/jobs/lib/apply-state';
import type { JobRepository } from '@/features/jobs/types';
import { postLoginRedirect, requiresUserInput, stepFromApplyState, stepFromRegistrationState } from './lib/intent-rules';
import type { IntentKind, IntentPrompt, IntentStore, IntentSummary, PendingIntent } from './types';

interface IntentDeps {
  readonly store: IntentStore;
  readonly jobs: JobRepository;
  readonly events: EventRepository;
  readonly candidate: CandidateRepository;
  readonly isLoggedIn: () => boolean;
}

/** Hata toleranslı çağrı: kontrol yapılamazsa karar API'ye bırakılır (gönderimde doğrulanır). */
const orNull = <T>(promise: Promise<T>): Promise<T | null> => promise.catch(() => null);

export class IntentService {
  constructor(private readonly deps: IntentDeps) {}

  /** Layout için hafif özet; ek API çağrısı yapmaz (yalnızca oturum okunur). */
  async summary(): Promise<IntentSummary | null> {
    const intent = await this.deps.store.read();
    return intent ? { kind: intent.kind, title: intent.title, path: intent.path, snoozed: intent.snoozed } : null;
  }

  /** "Başvur/Kaydol" tıklandığında niyeti oluşturur. Dış başvurulu veya bulunamayan hedef için null. */
  async capture(kind: IntentKind, slug: string): Promise<PendingIntent | null> {
    const base = { createdAt: Date.now(), snoozed: false };
    let intent: PendingIntent | null = null;

    if (kind === 'job') {
      const job = await this.deps.jobs.getBySlug(slug);
      if (job && !job.externalApplicationUrl) {
        intent = {
          ...base,
          kind,
          targetId: job.id,
          slug: job.slug,
          path: ROUTES.jobDetail(job.company.slug, job.slug),
          title: job.title,
          companyName: job.company.name,
          imageUrl: job.coverImageUrl ?? job.company.logoUrl,
        };
      }
    } else {
      const event = await this.deps.events.getBySlug(slug);
      if (event && !event.externalApplicationUrl) {
        intent = {
          ...base,
          kind,
          targetId: event.id,
          slug: event.slug,
          path: ROUTES.eventDetail(event.company.slug, event.slug),
          title: event.title,
          companyName: event.company.name,
          imageUrl: event.imageUrl ?? event.company.logoUrl,
        };
      }
    }

    if (intent) this.deps.store.save(intent);
    return intent;
  }

  /**
   * Popup'ın göstereceği adımı hesaplar. Tamamlanmış/kapanmış niyet burada silinir.
   * Paralel en fazla 3 API çağrısı yapar ve yalnızca niyet varken çağrılır.
   */
  async resolve(): Promise<IntentPrompt | null> {
    const intent = await this.deps.store.read();
    if (!intent) return null;

    const prompt = intent.kind === 'job' ? await this.resolveJob(intent) : await this.resolveEvent(intent);
    if (!prompt || prompt.step === 'done' || prompt.step === 'closed') this.deps.store.clear();
    return prompt;
  }

  async snooze(): Promise<void> {
    const intent = await this.deps.store.read();
    if (intent && !intent.snoozed) this.deps.store.save({ ...intent, snoozed: true });
  }

  /** Popup tekrar açılabilsin diye "Daha sonra" işaretini kaldırır (şeritteki "Devam et"). */
  async resume(): Promise<void> {
    const intent = await this.deps.store.read();
    if (intent?.snoozed) this.deps.store.save({ ...intent, snoozed: false });
  }

  discard(): void {
    this.deps.store.clear();
  }

  /** Başvuru/kayıt başarılı (veya zaten yapılmış) → aynı hedefe ait niyet silinir. */
  async complete(kind: IntentKind, targetId: string): Promise<void> {
    const intent = await this.deps.store.read();
    if (intent && intent.kind === kind && intent.targetId === targetId) this.deps.store.clear();
  }

  /** Giriş sonrası yönlendirme: niyet varsa ilan/etkinlik sayfası ya da profil tamamlama. */
  async redirectAfterLogin(requested: string): Promise<string> {
    const intent = await this.deps.store.read();
    if (!intent) return requested;
    const completeness = intent.kind === 'job' ? await orNull(this.deps.candidate.getCompleteness()) : null;
    return postLoginRedirect(intent, completeness ? completeness.isEligible : null, requested);
  }

  private async resolveJob(intent: PendingIntent): Promise<IntentPrompt | null> {
    const job = await this.deps.jobs.getBySlug(intent.slug);
    if (!job) return null;

    const loggedIn = this.deps.isLoggedIn();
    const [hasApplied, completeness] = loggedIn
      ? await Promise.all([orNull(this.deps.candidate.hasApplied(job.id)), orNull(this.deps.candidate.getCompleteness())])
      : [false, null];

    const state = resolveApplyState({
      expirationDate: job.expirationDate,
      externalApplicationUrl: job.externalApplicationUrl,
      isLoggedIn: loggedIn,
      hasApplied: Boolean(hasApplied),
      isProfileEligible: completeness ? completeness.isEligible : null,
    });

    return {
      intent: toPromptIntent(intent),
      step: stepFromApplyState(state, requiresUserInput(job.questions, job.contracts)),
      completeness: toCompletenessView(completeness),
      questions: job.questions,
      contracts: job.contracts,
    };
  }

  private async resolveEvent(intent: PendingIntent): Promise<IntentPrompt | null> {
    const event = await this.deps.events.getBySlug(intent.slug);
    if (!event) return null;

    const loggedIn = this.deps.isLoggedIn();
    const isRegistered = loggedIn ? await orNull(this.deps.candidate.isRegistered(event.id)) : false;
    const state = resolveRegistrationState({
      endDate: event.endDate,
      externalApplicationUrl: event.externalApplicationUrl,
      remainingQuota: event.remainingQuota,
      isLoggedIn: loggedIn,
      isRegistered: Boolean(isRegistered),
    });

    return {
      intent: toPromptIntent(intent),
      step: stepFromRegistrationState(state, requiresUserInput([], event.contracts)),
      completeness: null,
      questions: [],
      contracts: event.contracts,
    };
  }
}

function toPromptIntent({ kind, targetId, slug, path, title, companyName, imageUrl }: PendingIntent): IntentPrompt['intent'] {
  return { kind, targetId, slug, path, title, companyName, imageUrl };
}

function toCompletenessView(completeness: ProfileCompleteness | null): IntentPrompt['completeness'] {
  return completeness ? { percentage: completeness.percentage, threshold: completeness.threshold } : null;
}
