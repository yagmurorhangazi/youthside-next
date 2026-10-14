/**
 * [MODÜL: YOUTHSIDE UI KIT — YEREL KOPYA GİRİŞ NOKTASI]
 * Amaç: @ferhatcengz/youthside-ui-kit paketinin ana giriş noktasını (`.`) birebir dışa açmak.
 *
 * Neden yerel kopya: Paket GitHub Packages üzerinde private ve kurulum için token gerekiyor.
 * Token tanımlandığında bu klasör silinip `src/shared/ui/index.ts` içindeki import
 * '@ferhatcengz/youthside-ui-kit' paketine çevrilir; uygulama kodu değişmez (DIP).
 *
 * Kural: Bu klasördeki dosyalar upstream'in aynasıdır. Yeni bileşen/özellik buraya değil,
 * `src/shared/ui/` altına eklenir. Zorunlu değişiklikler "[youthside-next eklemesi]" notuyla işaretlenir.
 * Aşağısı upstream `src/index.ts` ile aynıdır; `editor.ts` ve `data.ts` alt giriş noktaları da ayrıdır.
 */

export * from './types';

// ── Temel yapı taşları ────────────────────────────────────────────────
export * from './primitives';

// ── Overlay & navigasyon ──────────────────────────────────────────────
export * from './components/Modal';
export * from './components/ConfirmModal';
export * from './components/PasswordConfirmModal';
export * from './components/Sheet';
export * from './components/Tooltip';
export * from './components/QRCodeModal';
export * from './components/GoogleMapsGuideModal';
export * from './components/NotificationChannelFlyout';

// ── Form & girdi ──────────────────────────────────────────────────────
export * from './components/Autocomplete';
export * from './components/DateRangeFilter';
export * from './components/DualRangeSlider';
export * from './components/SimpleRichTextEditor';

// ── Medya ─────────────────────────────────────────────────────────────
export * from './components/ImageDropzone';
export * from './components/VideoDropzone';
export * from './components/ImageCropper';

// ── Geri bildirim & durum ─────────────────────────────────────────────
export * from './components/Alert';
export * from './components/Toast';
export * from './components/ProgressBar';
export * from './components/ProgressMeter';
export * from './components/Skeleton';
export * from './components/Pagination';
export * from './components/ErrorBoundary';

// ── Veri gösterimi (liste sayfaları, dashboard) ──────────────────────
export * from './data-display/PageHeader';
export * from './data-display/DataTable';
export * from './data-display/StatCard';
export * from './data-display/StatusBadge';
export * from './data-display/EmptyState';
export * from './data-display/AccessDeniedView';

// ── Layout: sidebar/rail, header/navbar, mobil nav, uygulama kabuğu ───
export * from './layout';

// ── Dosya/klasör paylaşımı (share.youthside.co) ───────────────────────
// Bileşenler, ağ katmanı (istemci arayüzleri, HTTP ve mock uygulamaları, Provider) ve hook'lar.
// Kurulum ve backend: INTEGRATION.md → "Dosya paylaşım modülü".
export * from './share';
export * from './api';
export * from './hooks/useFileSelection';
export * from './hooks/useUpload';
export * from './hooks/useCurrentUser';
export * from './hooks/useResumableDrafts';
export * from './hooks/usePublicShare';
export * from './hooks/useCopyToClipboard';
export * from './hooks/useDropTarget';
export * from './hooks/useBeforeUnloadWarning';
export * from './utils/fileEntries';
export * from './utils/formatBytes';
export * from './utils/uploadProgress';
export * from './utils/uploadRules';
export * from './utils/shareErrors';
export * from './utils/resumeMatch';

// ── Yardımcılar ───────────────────────────────────────────────────────
export * from './utils/canvasUtils';
export * from './hooks/useClickOutside';
