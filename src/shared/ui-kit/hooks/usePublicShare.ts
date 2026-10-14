/**
 * @file Herkese açık paylaşım içeriği (SharedContentView). Giriş gerektirmez; token gönderilmez.
 */

import { useCallback, useEffect, useState } from 'react';
import { useShareApiClient } from '../api/ShareClientsProvider';
import { ApiError, isAbortError } from '../api/errors';
import type { PublicShare } from '../api/types';
import { getShareErrorMessage } from '../utils/shareErrors';

export type PublicShareStatus = 'loading' | 'ready' | 'notFound' | 'expired' | 'error';

export interface UsePublicShareResult {
  readonly status: PublicShareStatus;
  readonly share: PublicShare | null;
  readonly errorMessage: string | null;
  reload(): void;
}

interface Outcome {
  readonly key: string;
  readonly status: Exclude<PublicShareStatus, 'loading'>;
  readonly share: PublicShare | null;
  readonly errorMessage: string | null;
}

function statusOf(error: unknown): Exclude<PublicShareStatus, 'loading' | 'ready'> {
  if (error instanceof ApiError && error.status === 404) return 'notFound';
  if (error instanceof ApiError && error.status === 410) return 'expired';
  return 'error';
}

export function usePublicShare(token: string): UsePublicShareResult {
  const api = useShareApiClient();
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // Token ya da deneme değişince önceki sonuç geçersizdir: durum "yükleniyor" olarak türetilir
  const key = `${token}\u0000${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    api.getPublicShare(token, { signal: controller.signal }).then(
      (share) => setOutcome({ key, status: 'ready', share, errorMessage: null }),
      (error: unknown) => {
        if (isAbortError(error)) return;
        setOutcome({ key, status: statusOf(error), share: null, errorMessage: getShareErrorMessage(error) });
      },
    );
    return () => controller.abort();
  }, [api, token, key]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const current = outcome?.key === key ? outcome : null;
  return { status: current?.status ?? 'loading', share: current?.share ?? null, errorMessage: current?.errorMessage ?? null, reload };
}
