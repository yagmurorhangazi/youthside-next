/**
 * [MODÜL: SOSYAL GİRİŞ YAPILANDIRMASI — YALNIZCA SUNUCU]
 * Amaç: Google/LinkedIn istemci kimliklerini okumak ve LinkedIn yetkilendirme adresini üretmek.
 *
 * Akışlar (api-docs-v2 → auth/oauth-login):
 *   - Google: Tarayıcıda Google Identity Services `id_token` üretir → `auth.googleLogin` action'ı.
 *   - LinkedIn: Tam sayfa yönlendirme (popup yok; mobilde sorunsuz). `state` sunucu oturumunda
 *     saklanır (CSRF), dönüşte `/linkedin-callback` doğrular ve kodu API'ye iletir.
 * Referans: youthside-2026-ui/giris-yap → initGoogleSignIn, startLinkedInSignIn; linkedin-callback/
 */

import { GOOGLE_CLIENT_ID, LINKEDIN_CLIENT_ID } from 'astro:env/server';
import { ROUTES } from '@/config/site';

export const OAUTH_STATE_TTL_SECONDS = 10 * 60;

export interface OAuthConfig {
  readonly googleClientId: string | null;
  readonly linkedinClientId: string | null;
}

export function getOAuthConfig(): OAuthConfig {
  return { googleClientId: GOOGLE_CLIENT_ID || null, linkedinClientId: LINKEDIN_CLIENT_ID || null };
}

/** LinkedIn'e giden ve token değişiminde API'nin kullandığı adres BİREBİR aynı olmalı. */
export function linkedinRedirectUri(origin: string): string {
  return new URL(ROUTES.linkedinCallback, origin).href;
}

export function linkedinAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, state, scope: 'openid profile email' });
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
}

/** Tahmin edilemez CSRF değeri (192 bit). */
export function createOAuthState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Giriş sayfasında `?oauth_hata=` ile gösterilen mesajlar. */
export const OAUTH_ERRORS = {
  iptal: 'LinkedIn girişi iptal edildi.',
  guvenlik: 'Güvenlik doğrulaması tamamlanamadı (oturum süresi dolmuş olabilir). Lütfen tekrar dene.',
  linkedin: 'LinkedIn ile giriş yapılamadı. Lütfen tekrar dene veya e-posta ile giriş yap.',
  yapilandirma: 'LinkedIn ile giriş şu an kullanılamıyor.',
} as const;

export type OAuthErrorCode = keyof typeof OAUTH_ERRORS;

export function oauthErrorMessage(code: string | null): string | null {
  return code && code in OAUTH_ERRORS ? OAUTH_ERRORS[code as OAuthErrorCode] : null;
}
