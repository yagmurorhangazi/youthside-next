/**
 * [MODÜL: VİDEO ÖNİZLEME KARESİ — YALNIZCA TARAYICI]
 * Amaç: Posteri olmayan videolarda kapak olarak 0. kare yerine 1. saniyeyi göstermek.
 * Neden: 0. kare çoğu videoda siyah/düz renk geçiş karesidir; kullanıcı videoyu boş sanar.
 *        Önizleme için 1. saniyeye sarılır, ilk oynatmada video baştan başlar.
 * Referans: youthside-2026-ui → sirket-profili/index.php "Video Önizleme Karesi" (9253aff, 365640c).
 *           Referans bunu Video.js ile yapar; burada aynı davranış yerel <video> ile, ek kütüphanesiz.
 *
 * Kapsam: Kültür bloklarındaki videolar (`data-preview-frame`) ve Hakkımızda (Quill) videoları.
 */

const PREVIEW_TIME = 1;
const SELECTOR = 'video[data-preview-frame]:not([poster]), .prose-quill video:not([poster])';

function attach(video: HTMLVideoElement): void {
  if (video.dataset.previewReady) return;
  video.dataset.previewReady = 'true';

  const showPreview = () => {
    // Kullanıcı oynatmaya başladıysa dokunma; kısa videolarda ortadan ileri sarma.
    if (video.played.length === 0 && Number.isFinite(video.duration)) {
      video.currentTime = Math.min(PREVIEW_TIME, video.duration / 2);
    }
  };

  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) showPreview();
  else video.addEventListener('loadedmetadata', showPreview, { once: true });

  video.addEventListener(
    'play',
    () => {
      if (video.currentTime <= PREVIEW_TIME) video.currentTime = 0;
    },
    { once: true },
  );
}

export function initVideoPreviews(root: ParentNode = document): void {
  root.querySelectorAll<HTMLVideoElement>(SELECTOR).forEach(attach);
}
