/**
 * [MODÜL: OTURUM DOSYASI TEMİZLİĞİ]
 * Amaç: Süresi dolmuş Astro oturum dosyalarını diskten silmek; sunucu tarafında birikmeyi önlemek.
 *
 * Neden gerekli: Astro süresi dolan anahtarı okumaz ama dosyayı silmez (core/session/runtime.js).
 * Çalıştırma: Host crontab'ında saatte bir →
 *   docker compose exec -T web node scripts/cleanup-sessions.mjs
 * Sürekli çalışan süreç yoktur; boşta bellek maliyeti sıfırdır.
 *
 * Kurallar:
 *   1. 7 günden uzun süredir yazılmamış dosya okunmadan silinir (hiçbir anahtar 7 günden uzun yaşamaz).
 *   2. Kalan dosyalarda TÜM anahtarların süresi geçmişse dosya silinir
 *      (ör. yalnızca 24 saatlik bekleyen başvuru niyeti olan misafir oturumu).
 *   3. Okunamayan/bozuk dosya silinir (Astro da okurken böyle bir oturumu yok eder).
 */

import { readdir, readFile, stat, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parse } from 'devalue';

const SESSION_DIR = resolve(process.env.SESSION_DIR ?? '.sessions');
const MAX_IDLE_MS = 7 * 24 * 60 * 60 * 1000;

/** Oturum verisi `Map<anahtar, { data, expires }>` olarak devalue ile saklanır. */
function isFullyExpired(raw, now) {
  const map = parse(raw);
  if (!(map instanceof Map)) return true;
  for (const value of map.values()) {
    const expires = value && typeof value === 'object' ? value.expires : undefined;
    // Bitiş zamanı olmayan anahtar süresizdir → dosya korunur.
    if (typeof expires !== 'number' || expires >= now) return false;
  }
  return true;
}

async function main() {
  const now = Date.now();
  let entries;
  try {
    entries = await readdir(SESSION_DIR, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return console.log(`[session-gc] Klasör yok: ${SESSION_DIR}`);
    throw error;
  }

  let removed = 0;
  let kept = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const file = join(SESSION_DIR, entry.name);
    try {
      const info = await stat(file);
      let expired = now - info.mtimeMs > MAX_IDLE_MS;
      if (!expired) {
        try {
          expired = isFullyExpired(await readFile(file, 'utf8'), now);
        } catch {
          expired = true;
        }
      }
      if (expired) {
        await unlink(file);
        removed += 1;
      } else {
        kept += 1;
      }
    } catch (error) {
      // Dosya bu arada silinmiş olabilir (çıkış yapan kullanıcı); diğerlerine devam edilir.
      if (error.code !== 'ENOENT') console.error(`[session-gc] ${entry.name}:`, error.message);
    }
  }
  console.log(`[session-gc] silinen=${removed} kalan=${kept}`);
}

main().catch((error) => {
  console.error('[session-gc] Hata:', error);
  process.exitCode = 1;
});
