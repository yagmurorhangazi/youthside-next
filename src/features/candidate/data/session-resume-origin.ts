/**
 * [MODÜL: OTOMATİK CV KAYDI — OTURUM]
 * Amaç: Bu oturumda otomatik üretilen CV'nin adresini tutmak (bkz. `ResumeOrigin`).
 * Neden oturum: API henüz CV kaynağını (otomatik/elle) saklamıyor. Kayıt yoksa CV "elle yüklenmiş"
 * sayılır ve ezilmez; yani bilginin kaybolması yalnızca otomatik yenilemeyi atlatır, veri kaybettirmez.
 */

import type { AstroSession } from 'astro';
import type { ResumeOrigin } from '../types';

const SESSION_KEY = 'resumeOrigin';

export async function readResumeOrigin(session: AstroSession | undefined): Promise<ResumeOrigin | null> {
  const value = await session?.get(SESSION_KEY);
  return value && typeof value === 'object' && typeof value.url === 'string' ? value : null;
}

export function writeResumeOrigin(session: AstroSession | undefined, url: string | null): void {
  if (url) session?.set(SESSION_KEY, { url, source: 'auto' });
  else session?.delete(SESSION_KEY);
}
