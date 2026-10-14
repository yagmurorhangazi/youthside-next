/**
 * @file Giriş yapmış kullanıcı ("E-postanız" alanı). Bileşenler API'yi doğrudan çağırmaz, bu hook'u kullanır.
 * 401'de host'un `onUnauthorized`'ı HTTP katmanında çağrılır; burada durum 'unauthorized' olur.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuthClient } from '../api/ShareClientsProvider';
import type { AuthClient } from '../api/AuthClient';
import { isAbortError, isUnauthorizedError } from '../api/errors';
import type { CurrentUser } from '../api/types';
import { getShareErrorMessage } from '../utils/shareErrors';

export type CurrentUserStatus = 'loading' | 'ready' | 'unauthorized' | 'error';

export interface UseCurrentUserResult {
  readonly status: CurrentUserStatus;
  readonly user: CurrentUser | null;
  readonly errorMessage: string | null;
  reload(): void;
}

interface Outcome {
  /** Hangi isteğin sonucu: istemci ya da deneme değişince eski sonuç "yükleniyor" sayılır. */
  readonly client: AuthClient;
  readonly attempt: number;
  readonly status: Exclude<CurrentUserStatus, 'loading'>;
  readonly user: CurrentUser | null;
  readonly errorMessage: string | null;
}

export function useCurrentUser(): UseCurrentUserResult {
  const auth = useAuthClient();
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    auth.getCurrentUser({ signal: controller.signal }).then(
      (user) => setOutcome({ client: auth, attempt, status: 'ready', user, errorMessage: null }),
      (error: unknown) => {
        if (isAbortError(error)) return;
        setOutcome({
          client: auth,
          attempt,
          status: isUnauthorizedError(error) ? 'unauthorized' : 'error',
          user: null,
          errorMessage: getShareErrorMessage(error),
        });
      },
    );
    return () => controller.abort();
  }, [auth, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const current = outcome !== null && outcome.client === auth && outcome.attempt === attempt ? outcome : null;
  return {
    status: current?.status ?? 'loading',
    user: current?.user ?? null,
    errorMessage: current?.errorMessage ?? null,
    reload,
  };
}
