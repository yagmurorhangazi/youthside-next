/**
 * [MODÜL: BEKLEYEN NİYETİ GÖNDERME — İSTEMCİ]
 * Amaç: Popup'ın otomatik/hızlı gönderiminde doğru action'ı çağırıp sonucu tek tipe indirgemek.
 * Neden: İlan ve etkinlik için farklı action'lar var; popup türden bağımsız tek akış izler.
 * Yeni API çağrısı yok: mevcut `participation.apply` / `participation.registerEvent` kullanılır.
 */

import { actions } from 'astro:actions';
import { toFormErrors } from '@/shared/lib/action-result';
import { $participationDone } from './store';
import type { IntentPrompt } from './types';

export type SubmitOutcome =
  | { readonly status: 'done' }
  | { readonly status: 'needs_input' }
  | { readonly status: 'profile_incomplete' }
  | { readonly status: 'error'; readonly message: string };

const GENERIC = 'Gönderim sırasında bir sorun oluştu. Lütfen tekrar dene.';

export async function submitIntent(intent: IntentPrompt['intent'], acceptedContracts: readonly string[] = []): Promise<SubmitOutcome> {
  const { data, error } =
    intent.kind === 'job'
      ? await actions.participation.apply({ jobId: intent.targetId, jobSlug: intent.slug, acceptedContracts: [...acceptedContracts], answers: [] })
      : await actions.participation.registerEvent({ eventId: intent.targetId, acceptedContracts: [...acceptedContracts] });

  if (error) return { status: 'error', message: toFormErrors(error).message ?? GENERIC };
  switch (data.status) {
    case 'ok':
    case 'already_done':
      $participationDone.set({ kind: intent.kind, targetId: intent.targetId });
      return { status: 'done' };
    case 'profile_incomplete':
      return { status: 'profile_incomplete' };
    default:
      return { status: 'needs_input' };
  }
}
