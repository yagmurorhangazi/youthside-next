/**
 * [MODÜL: FOTOĞRAF GALERİSİ — REACT ISLAND]
 * Amaç: Şirket galerisini editoryal bir kolajda göstermek ve tıklanan fotoğrafı tam ekran açmak.
 * Neden: İlk kareyi odak görseli yapmak, eş boyutlu kutulardan daha güçlü bir görsel hiyerarşi kurar.
 * Erişilebilirlik: Klavye ile ←/→ gezinme, Escape ile kapatma; açıkken arka plan kaymaz.
 * Mobil: Kaydırma (swipe) ile önceki/sonraki fotoğrafa geçilir.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Images, Maximize2, X } from '@/shared/ui';

interface GalleryGridProps {
  readonly images: readonly { readonly id: string; readonly imageUrl: string; readonly title: string | null }[];
  readonly companyName: string;
  /** Önizleme modunda yalnızca ilk N fotoğraf gösterilir. */
  readonly limit?: number;
}

export default function GalleryGrid({ images, companyName, limit }: GalleryGridProps) {
  const [index, setIndex] = useState<number | null>(null);
  const touchStart = useRef<number | null>(null);
  const visible = limit ? images.slice(0, limit) : images;
  const isPreview = typeof limit === 'number';
  const isOpen = index !== null;
  const remaining = images.length - visible.length;

  const previewTileClass = (tileIndex: number): string => {
    if (visible.length === 1) return 'col-span-2 row-span-2 sm:col-span-12';
    if (visible.length === 2) return 'row-span-2 sm:col-span-6';
    return tileIndex === 0 ? 'col-span-2 row-span-2 sm:col-span-8' : 'sm:col-span-4';
  };

  const tileClass = (tileIndex: number): string => {
    if (isPreview) return previewTileClass(tileIndex);
    return tileIndex % 7 === 0 ? 'col-span-2 row-span-2' : '';
  };

  const go = (step: number) => setIndex((current) => (current === null ? null : (current + step + images.length) % images.length));

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIndex(null);
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]); // `go` yalnızca setState ve sabit uzunluk kullanır; yeniden bağlamaya gerek yok

  return (
    <>
      <ul
        className={
          isPreview
            ? 'grid auto-rows-[8rem] grid-cols-2 gap-2.5 sm:auto-rows-[10.5rem] sm:grid-cols-12 sm:gap-3'
            : 'grid auto-rows-[9rem] grid-cols-2 grid-flow-dense gap-3 sm:auto-rows-[11rem] sm:grid-cols-3 lg:grid-cols-4 lg:gap-4'
        }
      >
        {visible.map((image, i) => (
          <li key={image.id} className={tileClass(i)}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group relative block h-full min-h-11 w-full overflow-hidden rounded-[1.15rem] bg-slate-800 text-left outline-none ring-offset-2 ring-offset-slate-950 transition focus-visible:ring-2 focus-visible:ring-primary-400 sm:rounded-[1.35rem]"
              aria-label={`${companyName} fotoğraf ${i + 1} / ${images.length} — büyüt`}
            >
              <img
                src={image.imageUrl}
                alt={image.title ?? `${companyName} fotoğraf ${i + 1}`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
              />
              <span
                className={
                  isPreview
                    ? 'absolute inset-0 bg-slate-950/10 transition-colors group-hover:bg-slate-950/25'
                    : 'absolute inset-0 bg-linear-to-t from-slate-950/60 via-transparent to-slate-950/5 opacity-70 transition-opacity group-hover:opacity-90'
                }
                aria-hidden="true"
              />

              <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-800 opacity-0 shadow-sm backdrop-blur-sm transition group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true">
                <Maximize2 size={16} />
              </span>

              {!isPreview && image.title && (
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5 text-white sm:p-4">
                  <span className="line-clamp-1 min-w-0 text-xs font-bold sm:text-sm">{image.title}</span>
                </span>
              )}

              {remaining > 0 && i === visible.length - 1 && (
                <span className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/68 text-white backdrop-blur-[1px]">
                  <Images size={20} strokeWidth={1.7} aria-hidden="true" />
                  <span className="mt-1.5 text-xl font-extrabold tracking-tight">+{remaining}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/65">fotoğraf</span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {isOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${companyName} fotoğraf galerisi`}
            className="animate-backdrop-in fixed inset-0 z-90 flex items-center justify-center bg-slate-950/96 px-4 py-20 sm:px-16"
            onClick={() => setIndex(null)}
            onTouchStart={(event) => (touchStart.current = event.touches[0].clientX)}
            onTouchEnd={(event) => {
              if (touchStart.current === null) return;
              const delta = event.changedTouches[0].clientX - touchStart.current;
              if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
              touchStart.current = null;
            }}
          >
            <img
              src={images[index].imageUrl}
              alt={images[index].title ?? `${companyName} fotoğraf ${index + 1}`}
              key={index}
              className="animate-in fade-in zoom-in-95 max-h-[76vh] max-w-full rounded-2xl object-contain shadow-2xl duration-300 sm:max-w-[88vw]"
              onClick={(event) => event.stopPropagation()}
            />
            <div className="absolute inset-x-4 bottom-5 flex items-center justify-between gap-4 sm:inset-x-8">
              <div className="min-w-0 text-white">
                <p className="truncate text-sm font-bold">{images[index].title ?? companyName}</p>
                <p className="mt-0.5 text-xs text-white/55">{index + 1} / {images.length}</p>
              </div>
              <p className="hidden text-xs font-medium text-white/45 sm:block">Gezinmek için ok tuşlarını kullanabilirsin</p>
            </div>
            <button type="button" onClick={() => setIndex(null)} aria-label="Kapat" className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <X size={24} />
            </button>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    go(-1);
                  }}
                  aria-label="Önceki fotoğraf"
                  className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:flex"
                >
                  <ChevronLeft size={26} />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    go(1);
                  }}
                  aria-label="Sonraki fotoğraf"
                  className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:flex"
                >
                  <ChevronRight size={26} />
                </button>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
