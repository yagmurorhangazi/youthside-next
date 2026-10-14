/**
 * [MODÜL: COMPOSITION ROOT — SERVİS FABRİKASI]
 * Amaç: Uygulamanın kullandığı tüm repository/servis örneklerini TEK yerde oluşturmak.
 *
 * SOLID — Dependency Inversion: Sayfalar ve action'lar somut sınıfları değil arayüzleri tanır
 * (`JobRepository`, `CandidateRepository` ...). Implementasyon değişirse (ör. test için sahte
 * repository, GraphQL'e geçiş) yalnızca bu dosya değişir.
 *
 * Her istek için middleware bir kez çağırır; HttpClient o isteğin access token'ını bilir.
 */

import type { AstroSession } from 'astro';
import { PUBLIC_API_URL } from 'astro:env/client';
import { AuthService } from '@/features/auth/auth.service';
import { HttpCandidateRepository } from '@/features/candidate/data/http-candidate.repository';
import type { CandidateRepository } from '@/features/candidate/types';
import { HttpCompanyRepository } from '@/features/companies/data/http-company.repository';
import type { CompanyRepository } from '@/features/companies/types';
import { HttpEventRepository } from '@/features/events/data/http-event.repository';
import type { EventRepository } from '@/features/events/types';
import { SessionIntentStore } from '@/features/intent/data/session-intent.store';
import { IntentService } from '@/features/intent/intent.service';
import { HttpJobRepository } from '@/features/jobs/data/http-job.repository';
import type { JobRepository } from '@/features/jobs/types';
import { HttpLookupRepository, type LookupRepository } from '@/features/lookups/lookup.repository';
import { HttpClient } from '@/shared/api/http-client';

export interface Services {
  readonly jobs: JobRepository;
  readonly events: EventRepository;
  readonly companies: CompanyRepository;
  readonly lookups: LookupRepository;
  readonly candidate: CandidateRepository;
  readonly auth: AuthService;
  /** Yarıda kalan başvuru/kayıt niyeti (oturumda tutulur). */
  readonly intent: IntentService;
}

export function createHttpClient(getAccessToken: () => string | null = () => null): HttpClient {
  return new HttpClient({ baseUrl: PUBLIC_API_URL, getAccessToken });
}

export function createServices(getAccessToken: () => string | null = () => null, session?: AstroSession): Services {
  const http = createHttpClient(getAccessToken);
  const jobs = new HttpJobRepository(http);
  const events = new HttpEventRepository(http);
  const candidate = new HttpCandidateRepository(http);
  return {
    jobs,
    events,
    companies: new HttpCompanyRepository(http),
    lookups: new HttpLookupRepository(http),
    candidate,
    auth: new AuthService(http),
    intent: new IntentService({
      store: new SessionIntentStore(session),
      jobs,
      events,
      candidate,
      isLoggedIn: () => getAccessToken() !== null,
    }),
  };
}
