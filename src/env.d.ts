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
  }
}
