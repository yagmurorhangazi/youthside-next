// @ts-check
import { defineConfig, envField, sessionDrivers } from 'astro/config';

import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

/** Oturum ömrü = API refresh token ömrü (7 gün). Daha uzunu işe yaramaz, kısası gereksiz yere çıkış yaptırır. */
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

// https://astro.build/config
export default defineConfig({
  // Canonical/OG adresleri bu kökten üretilir.
  site: 'https://youthside.co',

  // Oturum ve API verisi istek anında okunduğu için sayfalar sunucuda render edilir.
  output: 'server',

  // Tip güvenli ortam değişkenleri. Değer `.env` dosyasından okunur; yoksa varsayılan kullanılır.
  env: {
    schema: {
      PUBLIC_API_URL: envField.string({
        context: 'client',
        access: 'public',
        default: 'https://api.youthside.co/api',
      }),
      // OAuth istemci kimlikleri (gizli değildir; istemci sırrı API'dedir). `access: 'secret'` yalnızca
      // değerin derlemeye gömülmeyip çalışma anında okunması içindir: Docker'da imaj yeniden derlenmeden
      // ortam değişkeniyle değiştirilebilir. Boş bırakılırsa ilgili düğme pasif görünür.
      GOOGLE_CLIENT_ID: envField.string({
        context: 'server',
        access: 'secret',
        default: '309122148261-90747nq7d58rv1f3p84q21u4i6nlcqdf.apps.googleusercontent.com',
      }),
      LINKEDIN_CLIENT_ID: envField.string({
        context: 'server',
        access: 'secret',
        default: '77mrspef4k1erh',
      }),
    },
  },

  // Giriş bilgileri (access/refresh token) sunucu tarafı oturumda tutulur; tarayıcıya yalnızca
  // httpOnly oturum kimliği çerezi gider.
  //   - Sürücü açıkça dosya sistemidir ve yol çalışma dizinine görelidir (`.sessions/`). Docker'da bu
  //     klasör volume'a bağlanır; adapter varsayılanı (node_modules/.astro) her deploy'da silinirdi.
  //   - Çerez ömrü sunucu TTL'iyle aynıdır; ikisi birlikte biter, sahipsiz dosya oluşmaz.
  //   - Süresi dolan dosyaları `scripts/cleanup-sessions.mjs` siler (Astro silmez, yalnızca okumaz).
  //   - Çok sunuculu ortamda yalnızca `driver` satırı `sessionDrivers.redis(...)` yapılır.
  session: {
    driver: sessionDrivers.fsLite({ base: '.sessions' }),
    cookie: { name: 'ys_session', sameSite: 'lax', path: '/', maxAge: SESSION_TTL_SECONDS },
    ttl: SESSION_TTL_SECONDS,
  },

  // Apache reverse proxy arkasında X-Forwarded-Host yalnızca bu alan adları için kabul edilir
  // (host header injection önlemi). Actions'ın origin kontrolü ve canonical URL'ler doğru çalışır.
  security: {
    allowedDomains: [
      { hostname: 'youthside.co', protocol: 'https' },
      { hostname: 'www.youthside.co', protocol: 'https' },
    ],
  },

  // Link üzerine gelindiğinde hedef sayfa önceden yüklenir → geçişler anlık hissettirir.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },

  integrations: [react()],

  adapter: node({
    mode: 'standalone'
  }),

  vite: {
    plugins: [tailwindcss()]
  }
});
