/**
 * [MODÜL: KİMLİK DOĞRULAMA TİPLERİ]
 * Amaç: Oturum, token ve kullanıcı özeti sözleşmeleri.
 */

/** Header, panel ve formlarda gösterilen giriş yapmış kullanıcı özeti. */
export interface SessionUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly avatarUrl: string | null;
}

export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  /** Access token'ın bitiş zamanı (epoch ms). */
  readonly expiresAt: number;
}

/** Sunucu oturumunda saklanan kayıt. */
export interface AuthSession {
  readonly tokens: AuthTokens;
  readonly user: SessionUser;
}

export interface RegisterInput {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly password: string;
}

/** Sosyal giriş kimlik bilgisi (api-docs-v2 → auth/oauth-login). */
export type OAuthCredential =
  | { readonly provider: 'google'; readonly idToken: string }
  | { readonly provider: 'linkedin'; readonly code: string; readonly redirectUri: string };

/** LinkedIn yönlendirmesi sürerken oturumda tutulan CSRF durumu (10 dk). */
export interface OAuthState {
  readonly state: string;
  readonly redirect: string;
}
