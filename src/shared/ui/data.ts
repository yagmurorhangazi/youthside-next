/**
 * [MODÜL: UI KIT — VERİ İÇE/DIŞA AKTARIM GİRİŞ NOKTASI]
 * Amaç: Kit'in `@ferhatcengz/youthside-ui-kit/data` alt yolunu `@/shared/ui/data` olarak sunmak.
 * Neden: `xlsx` büyük bir bağımlılıktır; yalnızca içe aktarma sonucu gösteren island bu dosyayı import eder.
 *        Pakete geçişte tek satır değişir.
 */

export * from '../ui-kit/data';
