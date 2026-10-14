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

## Docker ile yayına alma

Uygulama Node (SSR) sürecidir; Docker container'ında çalışır, Apache önünde TLS + reverse proxy olarak durur.

```sh
docker compose build --build-arg PUBLIC_API_URL=https://api.youthside.co/api
docker compose up -d            # 127.0.0.1:4321 (yalnızca sunucunun içinden erişilir)
docker compose logs -f web      # loglar
git pull && docker compose build && docker compose up -d   # güncelleme
```

- Apache vhost örneği: [deploy/apache-youthside.conf](./deploy/apache-youthside.conf) (`proxy`, `proxy_http`, `headers`, `ssl` modülleri).
- Oturumlar `sessions` volume'unda tutulur; deploy/yeniden başlatma kullanıcıları çıkış yaptırmaz.
- Oturum ömrü: girişli 7 gün hareketsizlik, bekleyen başvuru niyeti 24 saat. Süresi dolan dosyaları silmek için
  host crontab'ına ekleyin: `0 * * * * cd /srv/youthside-next && docker compose exec -T web node scripts/cleanup-sessions.mjs`
- `PUBLIC_API_URL` derleme anında koda gömülür; değiştirmek için imaj yeniden derlenir.

## Mimari özet

- **Veri:** Sayfalar `Astro.locals.services` üzerinden repository arayüzlerini kullanır; API yanıtı mapper'larda domain modeline çevrilir.
- **Oturum:** Access/refresh token sunucu oturumunda tutulur (httpOnly çerez). Token yenileme middleware'de tek uçuşla yapılır.
- **Bekleyen başvuru/kayıt:** Giriş, kayıt veya profil tamamlama araya girerse niyet oturumda 24 saat saklanır; global popup koşullar sağlanınca 5 sn geri sayımla (zorunlu soru/sözleşme varsa formla) tamamlatır. Profil kaydında CV yoksa tarayıcıda otomatik PDF CV üretilir.
- **Etkileşim:** Formlar Astro Actions ile sunucuya gider; tarayıcı API'yi ve token'ı doğrudan görmez.
- **Güvenlik:** API'den gelen HTML temizlenir, iframe'ler beyaz listeden çizilir, çıkış POST + origin kontrolüyle yapılır, güvenlik başlıkları eklenir.
- **SEO:** Sunucu render, canonical/OG etiketleri, JobPosting/Event/Organization JSON-LD, dinamik `sitemap.xml`, `robots.txt`.

Ayrıntılı kurallar ve klasör yapısı: [AGENTS.md](./AGENTS.md) · API: [docs/api-docs-v2.md](./docs/api-docs-v2.md)
