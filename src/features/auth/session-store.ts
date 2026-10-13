/**
 * [MODÜL: OTURUM DEPOSU — YALNIZCA SUNUCU]
 * Amaç: Giriş bilgilerini Astro sunucu oturumunda okumak/yazmak ve token yenilemeyi yönetmek.
 *
 * Güvenlik kararları:
 *   - Token'lar tarayıcıya hiç inmez (localStorage/okunabilir çerez yok → XSS ile çalınamaz).
 *     Tarayıcıda yalnızca httpOnly `ys_session` kimliği bulunur.
 *   - API refresh token'ı DÖNDÜRÜYOR (rotation) ve eski token tekrar kullanılırsa kullanıcının
 *     TÜM oturumlarını kapatıyor. Aynı anda gelen iki istek aynı refresh token'la yenileme
 *     yapmasın diye yenileme "tek uçuş"tur: aynı token için tek istek atılır, sonucu kısa süre
 *     paylaşılır (bkz. api-docs-v2 → "Oturum (token) yaşam döngüsü").
 */

import type { AstroSession } from 'astro';
import type { AuthService } from './auth.service';
import type { AuthSession, AuthTokens, SessionUser } from './types';

const SESSION_KEY = 'auth';
/** Access token bitmeden bu kadar önce yenilenir (saat kayması ve istek süresi payı). */
const REFRESH_LEEWAY_MS = 60_000;
/** Aynı eski refresh token ile gelen geç istekler bu süre boyunca aynı sonucu alır. */
const SHARED_RESULT_MS = 30_000;

export async function readAuthSession(session: AstroSession | undefined): Promise<AuthSession | null> {
  const value = await session?.get(SESSION_KEY);
  return value && typeof value === 'object' && 'tokens' in value ? (value as AuthSession) : null;
}

export function writeAuthSession(session: AstroSession | undefined, value: AuthSession): void {
  session?.set(SESSION_KEY, value);
}

/** Oturumu tamamen sonlandırır ve kimlik çerezini yeniler (session fixation önlemi). */
export function clearAuthSession(session: AstroSession | undefined): void {
  session?.destroy();
}

/** Profil/avatar güncellemesinden sonra header'daki bilgiyi tazeler. */
export async function updateSessionUser(session: AstroSession | undefined, patch: Partial<SessionUser>): Promise<void> {
  const current = await readAuthSession(session);
  if (current) writeAuthSession(session, { ...current, user: { ...current.user, ...patch } });
}

export function needsRefresh(tokens: AuthTokens, now = Date.now()): boolean {
  return tokens.expiresAt - REFRESH_LEEWAY_MS <= now;
}

// ── Tek uçuş yenileme ────────────────────────────────────────────────────────
const inflight = new Map<string, { promise: Promise<AuthTokens>; settledAt?: number }>();

export function refreshOnce(refreshToken: string, auth: AuthService): Promise<AuthTokens> {
  const now = Date.now();
  for (const [key, entry] of inflight) {
    if (entry.settledAt && now - entry.settledAt > SHARED_RESULT_MS) inflight.delete(key);
  }

  const existing = inflight.get(refreshToken);
  if (existing) return existing.promise;

  const entry: { promise: Promise<AuthTokens>; settledAt?: number } = {
    promise: auth.refresh(refreshToken).finally(() => {
      entry.settledAt = Date.now();
    }),
  };
  inflight.set(refreshToken, entry);
  return entry.promise;
}
