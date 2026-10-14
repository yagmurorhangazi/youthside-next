/**
 * [UÇ: LINKEDIN İLE GİRİŞİ BAŞLAT]
 * URL: /oauth/linkedin?redirect=/donulecek/yol
 * Amaç: CSRF `state` üretip sunucu oturumuna yazmak ve kullanıcıyı LinkedIn yetkilendirmesine göndermek.
 * Referans: youthside-2026-ui/giris-yap → buildLinkedInAuthUrl (orada state tarayıcı belleğindeydi)
 */
import type { APIRoute } from 'astro';
import { ROUTES, safeRedirect } from '@/config/site';
import { createOAuthState, getOAuthConfig, linkedinAuthorizeUrl, linkedinRedirectUri, OAUTH_STATE_TTL_SECONDS } from '@/features/auth/oauth';

export const GET: APIRoute = ({ url, session, redirect }) => {
  const back = safeRedirect(url.searchParams.get('redirect'));
  const { linkedinClientId } = getOAuthConfig();
  if (!linkedinClientId) return redirect(`${ROUTES.login}?oauth_hata=yapilandirma`, 302);

  const state = createOAuthState();
  session?.set('oauthState', { state, redirect: back }, { ttl: OAUTH_STATE_TTL_SECONDS });
  return redirect(linkedinAuthorizeUrl(linkedinClientId, linkedinRedirectUri(url.origin), state), 302);
};
