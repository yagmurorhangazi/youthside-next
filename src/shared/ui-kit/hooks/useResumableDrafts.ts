/**
 * @file Kullanıcının yarım kalan transferleri. "Kaldığın yerden devam et" kartı bunu kullanır.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShareApiClient } from '../api/ShareClientsProvider';
import { isAbortError } from '../api/errors';
import type { DraftSummary } from '../api/types';

export interface UseResumableDraftsResult {
  readonly drafts: readonly DraftSummary[];
  readonly loading: boolean;
  refresh(): void;
  /** Taslaktan vazgeç: sunucudan silinir. */
  discard(id: number): Promise<void>;
}

export function useResumableDrafts(enabled = true): UseResumableDraftsResult {
  const api = useShareApiClient();
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<{ readonly attempt: number; readonly drafts: readonly DraftSummary[] } | null>(null);
  const [discarded, setDiscarded] = useState<ReadonlySet<number>>(() => new Set());

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    api.listDrafts({ signal: controller.signal }).then(
      (list) => setOutcome({ attempt, drafts: list.filter((d) => d.uploadedCount < d.fileCount) }),
      (error: unknown) => {
        // Liste alınamazsa transfer yine yapılabilir; kart gösterilmez
        if (!isAbortError(error)) setOutcome({ attempt, drafts: [] });
      },
    );
    return () => controller.abort();
  }, [api, enabled, attempt]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  const discard = useCallback(
    async (id: number) => {
      setDiscarded((prev) => new Set(prev).add(id));
      await api.deleteShare(id).catch(() => undefined);
    },
    [api],
  );

  const current = enabled && outcome?.attempt === attempt ? outcome : null;
  const drafts = useMemo(() => (current?.drafts ?? []).filter((d) => !discarded.has(d.id)), [current, discarded]);
  return { drafts, loading: enabled && current === null, refresh, discard };
}
