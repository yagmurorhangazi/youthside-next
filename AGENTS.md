# Youthside Next — Proje Kuralları

Bu dosya Claude Code ve diğer AI ajanları için **bağlayıcı** proje talimatıdır. (`CLAUDE.md` bu dosyaya symlink'tir.)

## Proje

Youthside kariyer platformunun (öğrenci/yeni mezun ↔ şirket, ilan, etkinlik, kulüp) yeni nesil web arayüzü.

- **Stack:** Astro 7 · React 19 · TypeScript (strict) · Tailwind CSS v4 · `lucide-react` ikonlar
- **Mantık referansı:** https://github.com/FerhatCengz/youthside-2026-ui (`main` branch, PHP + jQuery). Sayfaların içeriği, iş kuralları ve akışları buradan alınır; kod birebir kopyalanmaz, bu projenin mimarisine çevrilir.
- **UI referansı:** https://github.com/FerhatCengz/youthside-ui-kit. Bileşenler buradan kullanılır, eksikler genişletilir (aşağıya bkz.).
- Arayüz dili Türkçe'dir; `<html lang="tr">`, tarih/sayı biçimleri `tr-TR`.

## Zorunlu kurallar

1. **Türkçe yorum satırı.** Her yeni dosyanın başında `[MODÜL: ...]` başlıklı bir blok yorum olur: *Amaç*, gerekiyorsa *Neden* (mimari karar) ve *Referans* (2026-ui'deki karşılığı). Fonksiyon/tip yorumları "ne"den çok "neden"i anlatır. Mevcut dosyaların yorum yoğunluğuna uyulur.
2. **SOLID.**
   - *SRP:* Bileşen yalnızca render eder. İş kuralı `features/<alan>/lib/`, veri erişimi repository, sabit içerik `content.ts`/`config` dosyasındadır.
   - *OCP:* Menü, footer, özellik kartı gibi listeler veri olarak tanımlanır; yeni öğe için bileşen değiştirilmez.
   - *LSP/DIP:* Sayfalar somut sınıfa değil `JobRepository` gibi arayüzlere bağımlıdır. Hangi implementasyonun kullanılacağı yalnızca `src/core/repositories.ts`'de seçilir.
   - *ISP:* Bileşen prop'ları ihtiyaç kadar dar tutulur (`Pick<...>` tercih edilir).
3. **DRY.** Aynı sınıf dizisi/mantık ikinci kez yazılacaksa önce paylaşılan parçaya çıkarılır (`shared/lib`, `shared/ui`). Renk kodu `src/styles/global.css` dışında hardcode edilmez (dekoratif gradyanlar hariç; onlar da `var(--color-…)` kullanır).
4. **API çalışmasından önce güncel dokümanı kullan/iste.** Güncel API dokümanı `docs/api-docs-v2.md`'dir (kullanıcı tarafından sağlandı). Yeni bir uç gerekiyorsa veya doküman eski görünüyorsa kullanıcıdan güncel API dosyalarını iste; varsayımla endpoint/alan adı yazma. Mümkünse canlı API'den yalnızca GET ile örnek yanıt alarak alan adlarını doğrula. API katmanı SOLID ve DRY'a uygun kurulur: tek HTTP istemcisi (`shared/api/http-client.ts`), alan başına repository, API yanıtı → domain modeli mapper'ı.
5. **Mobil öncelikli ve erişilebilir.** Her ekran 360px genişlikte yatay kaydırma olmadan çalışır; dokunma hedefleri ≥ 44px; etkileşimli öğelerde `aria-*`, odak halkası ve klavye desteği bulunur.
6. **Doğrulama.** Değişiklik sonrası `npm run check` (0 hata) ve `npm run build` çalıştırılır.

## Mimari

```
src/
  actions/                  Astro Actions (BFF): auth, participation, profile, lookups — tarayıcı yalnızca bunları çağırır
  config/site.ts            Marka, ROUTES, menü/footer verisi, korumalı yollar, safeRedirect (tek kaynak)
  core/services.ts          Composition root — repository/servis örnekleri burada oluşturulur (DIP)
  core/safe.ts              Hata toleranslı veri çağrısı (bir bölüm hata verirse sayfa çökmez)
  middleware.ts             Her istekte: oturum oku → token'ı tek uçuşla yenile → locals.services/user → korumalı yol kontrolü
  features/<alan>/          jobs · events · companies · candidate · auth · lookups · home · legal · common
    types.ts                Domain modeli + Repository arayüzü
    data/                   http-*.repository.ts + *.mappers.ts (API snake_case → domain camelCase)
    lib/                    Saf iş kuralları (son başvuru, başvuru/kayıt durumu, filtre şeması, JSON-LD)
    components/             Alana özel Astro bileşenleri ve React island'ları
  components/               Layout (header, footer, mobil menü, çerez) + generic FilterBar
  layouts/BaseLayout.astro  SEO head (OG, canonical, JSON-LD) + header/footer iskeleti
  shared/
    api/                    HttpClient, ApiError, parse yardımcıları, sayfalama modeli
    ui-kit/                 youthside-ui-kit'in yerel kopyası (DOKUNMA — README'ye bak)
    ui/                     Kit genişletmeleri + tek giriş noktası (`@/shared/ui`)
    lib/                    Tarih (Europe/Istanbul), metin, HTML temizleme, önbellek, URL parametreleri
  styles/global.css         Tailwind v4 + typography + tasarım token'ları
  pages/                    Rotalar (Türkçe slug). [company]/… şirket/kulüp profili, ilan ve etkinlik detayı
```

- **Veri akışı:** Sayfa → `Astro.locals.services.<repo>` (arayüz) → `Http*Repository` → `HttpClient` → API. Sayfalar API alan adlarını bilmez.
- **Oturum (güvenlik):** Token'lar Astro sunucu oturumunda tutulur, tarayıcıya yalnızca httpOnly `ys_session` çerezi gider. Refresh token rotation nedeniyle yenileme tek uçuştur (`session-store.ts`). Çıkış POST'tur ve API'de refresh token'ı iptal eder.
- **Ham HTML:** API'den gelen `description/about/content` alanları her zaman `sanitizeRichText` ile temizlenir; iframe'ler yalnızca Google Maps / YouTube beyaz listesinden src alınarak çizilir.
- **Astro vs React:** Statik içerik `.astro` (sıfır JS). Yalnızca etkileşim gerektiren parçalar React island olur.
- **Island sınırı:** Island'a fonksiyon/bileşen (ör. ikon) prop olarak geçirilemez; island ihtiyacını config'den kendisi import eder. Astro'dan React prop'una JSX verilemez.
- **İmport:** Her zaman `@/` alias'ı. UI bileşenleri yalnızca `@/shared/ui` üzerinden; `.astro` paylaşılan bileşenler dosya yoluyla.
- **Ortam:** `PUBLIC_API_URL` (`.env.example`). Varsayılan canlı API.

## UI Kit

- `src/shared/ui-kit/` paketin aynasıdır; değiştirilmez. Kit'te olan bir bileşen tekrar yazılmaz.
- Kit'te olmayan parça `src/shared/ui/` altına yazılır ve `index.ts`'e eklenir.
- Kit'ten yeni bileşen gerekirse upstream'den kopyalanır, `ui-kit/index.ts` ve `ui-kit/README.md` güncellenir.
- GitHub Packages token'ı tanımlandığında pakete geçiş adımları `src/shared/ui-kit/README.md`'dedir.

## Mevcut durum (2026-10-13)

- API kaynağı: `docs/api-docs-v2.md` (v2.7.0). Tüm vitrin sayfaları canlı API ile dinamik.
- Hazır: ana sayfa, ilanlar/etkinlikler/şirketler/kulüpler (arama, filtre, sıralama, sayfalama), şirket/kulüp profili
  (genel bakış, ilanlar, etkinlikler, ödüller, fotoğraflar), ilan detayı + başvuru, etkinlik detayı + kayıt/hızlı kayıt,
  giriş (2FA, doğrulama e-postası), kayıt, şifremi unuttum/sıfırla, panel (genel bakış, başvurularım, etkinliklerim,
  profilim + fotoğraf/CV yükleme + şifre değişikliği), yasal metinler, 404, sitemap.xml, robots.txt.
- Yapılmadı: OAuth (Google/LinkedIn) girişi — istemci kimlikleri gerekiyor.
- Prod notu: Oturum sürücüsü varsayılan olarak dosya sistemi; çok sunuculu ortamda Redis vb. kullanılmalı.
- Dev notu: React island'larında `_jsxDEV is not a function` görülürse `node_modules/.vite` silinip dev sunucusu yeniden başlatılır.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
