/**
 * [MODÜL: FOTOĞRAF GALERİSİ — REACT ISLAND]
 * Amaç: Şirket galerisini ızgarada göstermek ve tıklanan fotoğrafı tam ekran açmak.
 * Erişilebilirlik: Klavye ile ←/→ gezinme, Escape ile kapatma; açıkken arka plan kaymaz.
 * Mobil: Kaydırma (swipe) ile önceki/sonraki fotoğrafa geçilir.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

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
  const isOpen = index !== null;

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
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
        {visible.map((image, i) => (
          <li key={image.id} className={i === 0 && !limit ? 'col-span-2 row-span-2' : ''}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group block aspect-[4/3] h-full w-full overflow-hidden rounded-2xl bg-gray-100"
              aria-label={`${companyName} fotoğraf ${i + 1} / ${images.length} — büyüt`}
            >
              <img
                src={image.imageUrl}
                alt={image.title ?? `${companyName} fotoğraf ${i + 1}`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
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
            className="animate-backdrop-in fixed inset-0 z-90 flex items-center justify-center bg-gray-950/95"
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
              className="animate-in fade-in zoom-in-95 max-h-[85vh] max-w-[92vw] rounded-xl object-contain shadow-2xl duration-300"
              onClick={(event) => event.stopPropagation()}
            />
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white">
              {index + 1} / {images.length}
            </p>
            <button type="button" onClick={() => setIndex(null)} aria-label="Kapat" className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
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
                  className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
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
                  className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
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
