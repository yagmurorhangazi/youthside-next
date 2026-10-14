# Youthside UI Kit — yerel kopya

Kaynak: https://github.com/FerhatCengz/youthside-ui-kit (commit `5e2becd`, 2026-10-12)

Paket (`@ferhatcengz/youthside-ui-kit`) GitHub Packages üzerinde private olduğundan kit'in `src/` klasörünün **tamamı**
buraya kaynak olarak alındı (story, test, `src/test/` ve `*.fixtures.ts` hariç — bunlar yalnızca Storybook/Vitest içindir).

## Kurallar

- Bu klasör upstream'in aynasıdır. **Yeni bileşen buraya eklenmez**, `src/shared/ui/` altına eklenir.
- **Kit'te olan bir bileşen tekrar yazılmaz.** Önce upstream `src/index.ts`'teki listeye bakılır (ör. arama yapılabilir seçim → `Autocomplete`).
- Uygulama kodu bu klasörü doğrudan import etmez; her zaman `@/shared/ui` (ana giriş), `@/shared/ui/editor`
  (`RichTextEditor`, react-quill-new) veya `@/shared/ui/data` (`ImportResultModal`, xlsx) üzerinden kullanır.
- Zorunlu değişiklikler `[youthside-next eklemesi]` notuyla işaretlenir ve upstream'e önerilir.
- `RichTextEditor` tarayıcı API'si kullanır; Astro'da `client:only="react"` ile render edilir.

## Upstream'den farklar

| Dosya | Değişiklik | Neden |
|---|---|---|
| `primitives/Button.tsx` | `buttonClassName()` dışa açıldı | `ButtonLink` (`<a>`) aynı varyant tablosunu kullansın (DRY) |
| `index.ts` | Yalnızca başlık yorumu eklendi; dışa aktarımlar upstream ile aynı | Proje yorum kuralı |
| `components/Autocomplete.tsx`, `components/ErrorBoundary.tsx`, `components/ImageCropper.tsx`, `utils/canvasUtils.ts` | Tip importları `import type` / `type X` yapıldı | Projenin `verbatimModuleSyntax` ayarı; aksi halde Vite tipleri çalışma anında import etmeye çalışıp build kırılıyor |
| `package.json` (yeni) | Yalnızca `"sideEffects": ["*.css"]` | Upstream paketinkiyle aynı bildirim; olmadan kullanılmayan kit bileşenleri (dropzone, QR, sanal liste…) her island'ın paylaşılan chunk'ına giriyordu (42 KB → 171 KB) |

## İkonlar

Kit `lucide-react` import eder. Proje ikon seti Phosphor (`react-icons/pi`) olduğundan `lucide-react` modülü
`astro.config.mjs` (Vite alias) ve `tsconfig.json` (paths) ile `src/shared/ui/ui-kit-icon-adapter.ts`'e yönlenir.
Kit güncellenip yeni ikon kullanırsa `npm run check` eksik dışa aktarımı hata olarak gösterir; ikon adaptöre eklenir.

## Bağımlılıklar

Upstream `dependencies` + opsiyonel peer'lar proje `package.json`'ında: `@tanstack/react-virtual`, `date-fns`,
`qrcode.react`, `react-dropzone`, `react-easy-crop`, `react-quill-new` (3.7.0 sabit), `xlsx` (SheetJS CDN).

## Kit güncelleme

1. Upstream'i klonla, `src/` içeriğini story/test/fixture hariç buraya kopyala.
2. Yukarıdaki "Upstream'den farklar" tablosundaki değişiklikleri yeniden uygula (upstream'e alınmadıysa).
3. Upstream `package.json` bağımlılıkları değiştiyse projeye ekle; `npm run check` + `npm run build`.

## Pakete geçiş

1. `GH_PACKAGES_TOKEN` tanımla, `.npmrc` ekle, `npm install @ferhatcengz/youthside-ui-kit`
2. `src/shared/ui/index.ts`, `editor.ts`, `data.ts` içinde `../ui-kit` → `@ferhatcengz/youthside-ui-kit` (alt yollar: `/editor`, `/data`)
3. `src/styles/global.css` içinde kit `styles.css` importunu paketinkiyle değiştir; paket `@source` gerektirir (kit `theme.css`)
4. Bu klasörü sil
