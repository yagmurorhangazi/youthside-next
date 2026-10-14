/**
 * [MODÜL: KİMLİK DOĞRULAMA SERVİSİ]
 * Amaç: Aday hesabı için giriş, kayıt, token yenileme ve şifre akışlarının API çağrıları.
 * Uçlar: auth/login · auth/oauth-login · auth/refresh · auth/logout · candidates/platform-register
 *        auth/forgot-password · auth/validate-reset-token · auth/reset-password
 *        auth/resend-verification · auth/update-password
 *
 * Bu servis oturumu SAKLAMAZ; yalnızca API ile konuşur. Saklama `session-store.ts`'in işidir (SRP).
 * Vitrin sitesi yalnızca adaylar içindir: login isteklerinde `type: "candidate"` zorunlu.
 */

import type { HttpClient } from '@/shared/api/http-client';
import { isRecord, num, str, type UnknownRecord } from '@/shared/api/parse';
import type { AuthSession, AuthTokens, OAuthCredential, RegisterInput, SessionUser } from './types';

const ACCOUNT_TYPE = 'candidate';

/** Token yanıtını modele çevirir; `expires_in` saniye cinsindendir (varsayılan 900). */
export function toTokens(data: UnknownRecord): AuthTokens {
  const accessToken = str(data.access_token);
  const refreshToken = str(data.refresh_token);
  if (!accessToken || !refreshToken) throw new Error('Token yanıtı eksik.');
  return { accessToken, refreshToken, expiresAt: Date.now() + (num(data.expires_in) ?? 900) * 1000 };
}

export function toSessionUser(user: UnknownRecord, profile: UnknownRecord = {}): SessionUser {
  return {
    id: str(user.id) ?? '',
    name: str(user.name) ?? 'Kullanıcı',
    email: str(user.email) ?? '',
    avatarUrl: str(user.avatar_url) ?? str(profile.avatar_url),
  };
}

export class AuthService {
  constructor(private readonly http: HttpClient) {}

  async login(email: string, password: string, otpCode?: string): Promise<AuthSession> {
    const data = await this.http.post<UnknownRecord>('auth/login', {
      email,
      password,
      type: ACCOUNT_TYPE,
      ...(otpCode ? { otp_code: otpCode } : {}),
    });
    const user = isRecord(data.user) ? data.user : {};
    const profile = isRecord(data.profile) ? data.profile : {};
    return { tokens: toTokens(data), user: toSessionUser(user, profile) };
  }

  /**
   * Google (id_token) veya LinkedIn (authorization code) ile giriş/kayıt. Aynı e-postalı aday varsa
   * API hesabı bağlar; 2FA sorulmaz. Yanıtta `profile` yoktur, kullanıcı özeti `user`'dan okunur.
   */
  async oauthLogin(credential: OAuthCredential): Promise<AuthSession> {
    const body =
      credential.provider === 'google'
        ? { provider: 'google', id_token: credential.idToken }
        : { provider: 'linkedin', code: credential.code, redirect_uri: credential.redirectUri };
    const data = await this.http.post<UnknownRecord>('auth/oauth-login', body);
    return { tokens: toTokens(data), user: toSessionUser(isRecord(data.user) ? data.user : {}) };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    return toTokens(await this.http.post<UnknownRecord>('auth/refresh', { refresh_token: refreshToken }));
  }

  /** Refresh token'ı sunucuda iptal eder. Hata yutulur: çıkış her durumda tamamlanmalı. */
  async logout(refreshToken: string): Promise<void> {
    await this.http.post('auth/logout', { refresh_token: refreshToken }).catch(() => undefined);
  }

  /** Token dönmez; hesaba doğrulama e-postası gider. */
  async register(input: RegisterInput): Promise<void> {
    await this.http.post('candidates/platform-register', {
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      password: input.password,
      confirm_password: input.password,
    });
  }

  async forgotPassword(email: string): Promise<void> {
    await this.http.post('auth/forgot-password', { email, type: ACCOUNT_TYPE });
  }

  /** Geçerliyse token'a ait e-postayı döner. */
  async validateResetToken(token: string): Promise<string | null> {
    const data = await this.http.get<UnknownRecord>('auth/validate-reset-token', { token });
    return str(data?.email);
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this.http.post('auth/reset-password', { token, password });
  }

  async resendVerification(email: string, redirectUrl: string): Promise<void> {
    await this.http.post('auth/resend-verification', { email, redirect_url: redirectUrl });
  }

  /** Giriş yapmış kullanıcının şifresini değiştirir (Bearer token gerekir). */
  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.http.post('auth/update-password', {
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: newPassword,
    });
  }
}
