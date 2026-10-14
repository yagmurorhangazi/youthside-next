/**
 * @file `xlsx` gerektiren veri içe/dışa aktarım bileşenleri giriş noktası.
 * Author: Ferhat Cengiz
 *
 * Ayrı subpath olmasının sebebi: xlsx opsiyonel peer dependency ve boyutu büyük.
 * Bu subpath'i import etmeyen proje paketi kurmak zorunda değil.
 */

export * from './components/ImportResultModal';
