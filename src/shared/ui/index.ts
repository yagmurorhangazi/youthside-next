/**
 * [MODÜL: UI GİRİŞ NOKTASI]
 * Amaç: Uygulamanın tüm UI bileşenlerini tek adresten (`@/shared/ui`) sunmak.
 *
 * Neden: Sayfalar kit'in nereden geldiğini bilmez. Yerel kopyadan npm paketine geçişte
 * yalnızca aşağıdaki ilk satır değişir (Dependency Inversion).
 */

export * from '../ui-kit';

// ── Proje genişletmeleri (kit'te olmayan, Youthside web'e özel parçalar) ──
export * from './ButtonLink';
export * from './FormAlert';
export * from './FormField';
export * from './NameInput';
export * from './PasswordInput';
export * from './Popover';
