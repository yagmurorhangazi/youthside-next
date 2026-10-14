/**
 * [MODÜL: GİRİŞİ TAMAMLAMA — YALNIZCA SUNUCU]
 * Amaç: E-posta/şifre, Google ve LinkedIn girişlerinin ortak son adımı:
 *   oturum kimliğini yenile → token'ları yaz → bekleyen niyete göre dönüş adresini hesapla.
 * Neden ortak: Üç giriş yolu aynı güvenlik adımlarını ve aynı yönlendirme kuralını izlemeli (DRY).
 */

import type { AstroSession } from 'astro';
import { safeRedirect } from '@/config/site';
import { createServices } from '@/core/services';
import { writeAuthSession } from './session-store';
import type { AuthSession } from './types';

export async function completeLogin(session: AstroSession | undefined, auth: AuthSession, requested: string | null | undefined): Promise<string> {
  // Oturum kimliği yenilenir: giriş öncesi ele geçirilmiş bir kimlik kullanılamaz (session fixation).
  // Bekleyen başvuru niyeti gibi veriler yeni kimliğe taşınır.
  await session?.regenerate();
  writeAuthSession(session, auth);
  // İsteğin servisleri girişten önce (token'sız) kuruldu; yönlendirme kararı profil doluluğunu
  // okuyacağı için yeni token'la kurulan servis kullanılır.
  const authed = createServices(() => auth.tokens.accessToken, session);
  return authed.intent.redirectAfterLogin(safeRedirect(requested));
}
