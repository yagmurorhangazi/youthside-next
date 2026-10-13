# Youthside Next

Youthside kariyer platformunun (öğrenciler ve yeni mezunlar için staj, iş ve etkinlik fırsatları) yeni nesil web arayüzü.

**Stack:** Astro 7 (SSR, Node adapter) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Youthside UI Kit

## Kurulum

```sh
npm install
cp .env.example .env   # gerekirse PUBLIC_API_URL'i değiştir
npm run dev            # http://localhost:4321
```

| Komut | Açıklama |
| :-- | :-- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run check` | Astro + TypeScript tip denetimi |
| `npm run build` | Production build (`dist/`) |
| `node dist/server/entry.mjs` | Production sunucusu |

## Ortam değişkenleri

| Değişken | Varsayılan | Açıklama |
| :-- | :-- | :-- |
| `PUBLIC_API_URL` | `https://api.youthside.co/api` | Youthside API kök adresi |

API'nin CORS listesinde `http://localhost:4321` ve `https://youthside.co` bulunur. Sunucu tarafı istekler CORS'a takılmaz; yalnızca görüntülenme sayacı tarayıcıdan çağrılır.

## Mimari özet

- **Veri:** Sayfalar `Astro.locals.services` üzerinden repository arayüzlerini kullanır; API yanıtı mapper'larda domain modeline çevrilir.
- **Oturum:** Access/refresh token sunucu oturumunda tutulur (httpOnly çerez). Token yenileme middleware'de tek uçuşla yapılır.
- **Etkileşim:** Formlar Astro Actions ile sunucuya gider; tarayıcı API'yi ve token'ı doğrudan görmez.
- **Güvenlik:** API'den gelen HTML temizlenir, iframe'ler beyaz listeden çizilir, çıkış POST + origin kontrolüyle yapılır, güvenlik başlıkları eklenir.
- **SEO:** Sunucu render, canonical/OG etiketleri, JobPosting/Event/Organization JSON-LD, dinamik `sitemap.xml`, `robots.txt`.

Ayrıntılı kurallar ve klasör yapısı: [AGENTS.md](./AGENTS.md) · API: [docs/api-docs-v2.md](./docs/api-docs-v2.md)
