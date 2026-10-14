/**
 * [MODÜL: İSTEK ORTA KATMANI (MIDDLEWARE)]
 * Amaç: Her sayfa/action isteğinden önce çalışıp:
 *   1. Oturumdaki token'ları okur, süresi dolmak üzereyse tek uçuşla yeniler
 *   2. İsteğe özel servisleri (`locals.services`) ve kullanıcıyı (`locals.user`) hazırlar
 *   3. Korumalı sayfalara misafir erişimini giriş sayfasına yönlendirir
 *   4. Temel güvenlik başlıklarını ekler
 *
 * Sayfalar token, çerez veya yenileme mantığını bilmez; yalnızca `Astro.locals` kullanır (SRP).
 */

import type { APIContext } from 'astro';
import { defineMiddleware } from 'astro:middleware';
import { ROUTES, isProtectedPath } from '@/config/site';
import { createHttpClient, createServices } from '@/core/services';
import { AuthService } from '@/features/auth/auth.service';
import { clearAuthSession, needsRefresh, readAuthSession, refreshOnce, writeAuthSession } from '@/features/auth/session-store';
import type { AuthSession } from '@/features/auth/types';
import { ApiError } from '@/shared/api/errors';

/** Anonim istemcili auth servisi — yalnızca token yenilemek için (Bearer gerekmez). */
const refresher = new AuthService(createHttpClient());

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

async function resolveAuth(context: APIContext): Promise<AuthSession | null> {
  const current = await readAuthSession(context.session);
  if (!current) return null;
  if (!needsRefresh(current.tokens)) return current;

  try {
    const tokens = await refreshOnce(current.tokens.refreshToken, refresher);
    const next = { ...current, tokens };
    writeAuthSession(context.session, next);
    return next;
  } catch (error) {
    // 400/401 → refresh token geçersiz: oturum kapanır. Ağ hatasında oturum korunur, bu istek misafir sayılır.
    if (error instanceof ApiError && !error.isNetworkError) clearAuthSession(context.session);
    else console.error('[AUTH] Token yenilenemedi:', error);
    return null;
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const auth = await resolveAuth(context);

  context.locals.user = auth?.user ?? null;
  context.locals.services = createServices(() => auth?.tokens.accessToken ?? null, context.session);

  const { pathname, search } = context.url;
  if (!auth && isProtectedPath(pathname)) {
    return context.redirect(`${ROUTES.login}?redirect=${encodeURIComponent(pathname + search)}`, 302);
  }

  const response = await next();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(name)) response.headers.set(name, value);
  }
  return response;
});
