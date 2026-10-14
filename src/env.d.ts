/**
 * [MODÜL: ASTRO GLOBAL TİPLERİ]
 * Amaç: Middleware'in her isteğe eklediği `locals` alanlarını ve oturum verisini tiplemek.
 */

declare namespace App {
  interface Locals {
    /** Bu isteğe ait (token'ı bilen) servisler. */
    services: import('./core/services').Services;
    /** Giriş yapmış aday; misafirde null. */
    user: import('./features/auth/types').SessionUser | null;
  }

  interface SessionData {
    auth: import('./features/auth/types').AuthSession;
    /** Yarıda kalan başvuru/kayıt (24 saat). */
    pendingIntent: import('./features/intent/types').PendingIntent;
    /** Bu oturumda otomatik üretilen CV'nin adresi — elle yüklenen CV'yi ezmemek için. */
    resumeOrigin: import('./features/candidate/types').ResumeOrigin;
    /** LinkedIn ile giriş sürerken CSRF `state` değeri ve dönüş adresi (10 dk). */
    oauthState: import('./features/auth/types').OAuthState;
  }
}
