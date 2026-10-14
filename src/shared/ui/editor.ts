/**
 * [MODÜL: UI KIT — ZENGİN METİN EDİTÖRÜ GİRİŞ NOKTASI]
 * Amaç: Kit'in `@ferhatcengz/youthside-ui-kit/editor` alt yolunu `@/shared/ui/editor` olarak sunmak.
 * Neden: `react-quill-new` ağırdır; ana `@/shared/ui` girişine konursa her island'a bulaşırdı.
 *        Yalnızca editör kullanan island bu dosyayı import eder. Pakete geçişte tek satır değişir.
 */

export * from '../ui-kit/editor';
