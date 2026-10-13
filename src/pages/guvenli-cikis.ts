/**
 * [MODÜL: GÜVENLİ ÇIKIŞ ENDPOINT'İ]
 * Amaç: Refresh token'ı API'de iptal edip sunucu oturumunu sonlandırmak.
 * Referans: api-docs-v2 → "Çıkışta mutlaka POST /auth/logout çağrılmalı; yalnızca yerel depoyu silmek yetmez."
 *
 * Yalnızca POST kabul edilir (Astro POST isteklerinde Origin kontrolü yapar → CSRF koruması).
 * GET ile gelinirse hiçbir şey yapılmadan ana sayfaya dönülür.
 */

import type { APIRoute } from 'astro';
import { ROUTES } from '@/config/site';
import { clearAuthSession, readAuthSession } from '@/features/auth/session-store';

export const POST: APIRoute = async ({ session, locals, redirect }) => {
  const auth = await readAuthSession(session);
  if (auth) await locals.services.auth.logout(auth.tokens.refreshToken);
  clearAuthSession(session);
  return redirect(ROUTES.home, 303);
};

export const GET: APIRoute = ({ redirect }) => redirect(ROUTES.home, 302);
