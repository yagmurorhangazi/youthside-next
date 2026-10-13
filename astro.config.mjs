// @ts-check
import { defineConfig, envField } from 'astro/config';

import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

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
    },
  },

  // Giriş bilgileri (access/refresh token) sunucu tarafı oturumda tutulur; tarayıcıya yalnızca
  // httpOnly oturum kimliği çerezi gider. Sürücüyü Node adapter'ı sağlar (varsayılan: dosya sistemi;
  // çok sunuculu ortamda Redis vb. bir sürücüye geçilmeli). TTL = refresh token ömrü (7 gün).
  session: {
    cookie: { name: 'ys_session', sameSite: 'lax', path: '/' },
    ttl: 60 * 60 * 24 * 7,
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
