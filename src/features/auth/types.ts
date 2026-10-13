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
