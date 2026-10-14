/**
 * [UÇ: LINKEDIN DÖNÜŞÜ]
 * URL: /linkedin-callback?code=…&state=…  (LinkedIn uygulamasında kayıtlı redirect URL)
 * Amaç: `state`'i oturumdakiyle karşılaştırmak (CSRF), kodu API'ye (auth/oauth-login) iletmek,
 *       oturumu açıp bekleyen niyete/dönüş adresine yönlendirmek. Hata → giriş sayfası + mesaj.
 * Referans: youthside-2026-ui/linkedin-callback/index.php (orada postMessage ile popup'tan dönülüyordu)
 */
import type { APIRoute } from 'astro';
import { ROUTES } from '@/config/site';
import { completeLogin } from '@/features/auth/complete-login';
import { linkedinRedirectUri, type OAuthErrorCode } from '@/features/auth/oauth';

const CANCEL_ERRORS = new Set(['user_cancelled_login', 'user_cancelled_authorize']);

export const GET: APIRoute = async ({ url, session, redirect, locals }) => {
  const saved = await session?.get('oauthState');
  session?.delete('oauthState');

  const fail = (code: OAuthErrorCode) => {
    const back = saved?.redirect ? `&redirect=${encodeURIComponent(saved.redirect)}` : '';
    return redirect(`${ROUTES.login}?oauth_hata=${code}${back}`, 302);
  };

  const providerError = url.searchParams.get('error');
  if (providerError) return fail(CANCEL_ERRORS.has(providerError) ? 'iptal' : 'linkedin');

  const code = url.searchParams.get('code');
  if (!saved || !code || url.searchParams.get('state') !== saved.state) return fail('guvenlik');

  try {
    const auth = await locals.services.auth.oauthLogin({ provider: 'linkedin', code, redirectUri: linkedinRedirectUri(url.origin) });
    return redirect(await completeLogin(session, auth, saved.redirect), 302);
  } catch (error) {
    console.error('[OAUTH] LinkedIn girişi başarısız:', error);
    return fail('linkedin');
  }
};
