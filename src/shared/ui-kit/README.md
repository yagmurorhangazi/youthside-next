# Youthside UI Kit — yerel kopya

Kaynak: https://github.com/FerhatCengz/youthside-ui-kit (commit `5e2becd`, 2026-10-12)

Paket (`@ferhatcengz/youthside-ui-kit`) GitHub Packages üzerinde private olduğundan, ihtiyaç duyulan bileşenler buraya kaynak olarak alındı.

## Kurallar

- Bu klasör upstream'in aynasıdır. **Yeni bileşen buraya eklenmez**, `src/shared/ui/` altına eklenir.
- Uygulama kodu bu klasörü doğrudan import etmez; her zaman `@/shared/ui` üzerinden kullanır.
- Zorunlu değişiklikler `[youthside-next eklemesi]` notuyla işaretlenir ve upstream'e önerilir.

## Upstream'den farklar

| Dosya | Değişiklik | Neden |
|---|---|---|
| `primitives/Button.tsx` | `buttonClassName()` dışa açıldı | `ButtonLink` (`<a>`) aynı varyant tablosunu kullansın (DRY) |

## Alınan parçalar

`primitives/*` · `components/{Alert,Modal,useOverlayDialog,Pagination,Skeleton,Toast}` · `data-display/EmptyState` · `hooks/useClickOutside` · `layout/{types,UserAvatar,navUtils}` · `styles.css`

Yeni bir kit bileşeni gerektiğinde upstream'den kopyalanır, `index.ts`'e eklenir ve bu tablo güncellenir.

## Pakete geçiş

1. `GH_PACKAGES_TOKEN` tanımla, `.npmrc` ekle, `npm install @ferhatcengz/youthside-ui-kit`
2. `src/shared/ui/index.ts` içinde `from '../ui-kit'` → `from '@ferhatcengz/youthside-ui-kit'`
3. `src/styles/global.css` içinde kit `styles.css` importunu paketinkiyle değiştir
4. Bu klasörü sil
