/**
 * [MODÜL: OTOMATİK CV POLİTİKASI]
 * Amaç: Profil kaydedildiğinde CV'nin otomatik (yeniden) üretilip üretilmeyeceğine karar vermek.
 *
 * Neden: CV tek başına doluluğun %35'i; CV'siz azami puan %65 olduğundan CV olmadan başvuru yapılamaz.
 * Profil bilgisinden üretilen CV bu engeli kaldırır. Ancak adayın kendi yüklediği CV asla ezilmez:
 * şüphede (kaynak bilinmiyor) üretilmez.
 * Referans: youthside-2026-ui/panelim/profilim → cvSource ('none' | 'auto' | 'manual') + generateAutoCV
 */

import type { ResumeOrigin } from '../types';

/** Önbellek kırıcı `?v=` parametresinden bağımsız karşılaştırma için. */
function stripQuery(url: string): string {
  return url.split('?')[0];
}

export interface ResumePolicyInput {
  /** Profilde CV var mı (completeness.missing_fields içinde resume_url yoksa var). */
  readonly hasResume: boolean;
  /** Profildeki mevcut CV adresi (yalnızca otomatik kayıt varsa okunur). */
  readonly currentUrl: string | null;
  /** Bu oturumda otomatik üretilmiş CV kaydı. */
  readonly origin: ResumeOrigin | null;
}

export function shouldAutoGenerateResume({ hasResume, currentUrl, origin }: ResumePolicyInput): boolean {
  if (!hasResume) return true;
  if (!origin || !currentUrl) return false;
  return stripQuery(origin.url) === stripQuery(currentUrl);
}
