/**
 * [MODÜL: SOSYAL MEDYA PLATFORMLARI]
 * Amaç: Desteklenen platformları ve ekranda/ekran okuyucuda görünen adlarını tek kaynaktan sunmak.
 * Neden: Mapper (hangi platform kabul edilir) ve profil başlığı (aria-label) aynı listeyi kullanır (DRY);
 *        yeni platform = buraya bir kayıt + SocialIcon'a bir ikon (OCP).
 * Referans: youthside-2026-ui (yeni-is-veren-header) → sirket-profili/_bootstrap.php `$socialPlatforms`
 *
 * Not: `tiktok` API dokümanında (v2.7.0) henüz listelenmiyor; referans sitede destekleniyor.
 *      API göndermediği sürece görünmez, gönderdiğinde ek değişiklik gerekmez.
 */

import type { SocialPlatform } from '../types';

export const SOCIAL_PLATFORM_LABELS: Readonly<Record<SocialPlatform, string>> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  twitter: 'X',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
};

export const SOCIAL_PLATFORMS = Object.keys(SOCIAL_PLATFORM_LABELS) as readonly SocialPlatform[];

export function isSocialPlatform(value: string | null | undefined): value is SocialPlatform {
  return !!value && (SOCIAL_PLATFORMS as readonly string[]).includes(value);
}
