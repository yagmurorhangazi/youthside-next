/**
 * [MODÜL: OTURUM TABANLI NİYET DEPOSU — YALNIZCA SUNUCU]
 * Amaç: Bekleyen niyeti Astro sunucu oturumunda (httpOnly `ys_session`) tutmak.
 *
 * Neden oturum: Giriş öncesi ve sonrası aynı kaynaktır. `session.regenerate()` veriyi koruduğu için
 * giriş anında niyet taşınır; çıkışta `destroy()` ile kendiliğinden silinir.
 * Ömür: Anahtar bazlı TTL (24 saat). Girişli oturumun süresini uzatmaz; misafir oturumu dosyası
 * 24 saat sonra `scripts/cleanup-sessions.mjs` tarafından silinir.
 */

import type { AstroSession } from 'astro';
import { isIntentExpired, remainingTtlSeconds } from '../lib/intent-rules';
import type { IntentStore, PendingIntent } from '../types';

const SESSION_KEY = 'pendingIntent';

function isPendingIntent(value: unknown): value is PendingIntent {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    (item.kind === 'job' || item.kind === 'event') &&
    typeof item.targetId === 'string' &&
    typeof item.slug === 'string' &&
    typeof item.path === 'string' &&
    typeof item.createdAt === 'number'
  );
}

export class SessionIntentStore implements IntentStore {
  constructor(private readonly session: AstroSession | undefined) {}

  async read(): Promise<PendingIntent | null> {
    const value = await this.session?.get(SESSION_KEY);
    if (!isPendingIntent(value)) return null;
    if (isIntentExpired(value)) {
      this.clear();
      return null;
    }
    return value;
  }

  save(intent: PendingIntent): void {
    this.session?.set(SESSION_KEY, intent, { ttl: remainingTtlSeconds(intent) });
  }

  clear(): void {
    this.session?.delete(SESSION_KEY);
  }
}
