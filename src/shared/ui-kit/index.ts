/**
 * [MODÜL: YOUTHSIDE UI KIT — YEREL KOPYA GİRİŞ NOKTASI]
 * Amaç: @ferhatcengz/youthside-ui-kit paketinden alınan bileşenleri tek noktadan dışa açmak.
 *
 * Neden yerel kopya: Paket GitHub Packages üzerinde private ve kurulum için token gerekiyor.
 * Token tanımlandığında bu klasör silinip `src/shared/ui/index.ts` içindeki import
 * '@ferhatcengz/youthside-ui-kit' paketine çevrilir; uygulama kodu değişmez (DIP).
 *
 * Kural: Bu klasördeki dosyalar upstream'in aynasıdır. Yeni bileşen/özellik buraya değil,
 * `src/shared/ui/` altına eklenir. Zorunlu değişiklikler "[youthside-next eklemesi]" notuyla işaretlenir.
 */

export * from './primitives';
export * from './components/Alert';
export * from './components/Modal';
export * from './components/Pagination';
export * from './components/Skeleton';
export * from './components/Toast';
export * from './data-display/EmptyState';
export * from './hooks/useClickOutside';
export * from './layout/UserAvatar';
export * from './layout/navUtils';
export type { NavIcon, NavItem, UserSummary, NavBrand } from './layout/types';
