/**
 * [MODÜL: ÖDÜL DETAY PENCERESİ — REACT ISLAND]
 * Amaç: Kartta kırpılan ödül metninin tamamını erişilebilir bir pencerede göstermek.
 * Neden island: Yalnızca açma/kapama etkileşimi gerektirir; kartın kendisi statik Astro'dur.
 *               Pencere kit'in Modal'ıdır (odak hapsi, Esc ile kapanma, odağı geri verme).
 * Güvenlik: `contentHtml` mapper'da sanitizeRichText'ten geçmiştir (sunucuda).
 * Referans: youthside-2026-ui (yeni-is-veren-header) → sirket-profili/oduller/index.php "Detayları görüntüle"
 */

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Modal } from '@/shared/ui';
import type { Award } from '../types';

type Props = Pick<Award, 'title' | 'contentHtml' | 'imageUrl' | 'year' | 'givenBy'>;

export default function AwardDetails({ title, contentHtml, imageUrl, year, givenBy }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const meta = [givenBy, year].filter(Boolean).join(' · ');

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${title} ödülünün detaylarını görüntüle`}
        className="group mt-4 inline-flex min-h-11 items-center gap-3 self-start rounded-full text-sm font-bold text-gray-900 transition-colors hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-4"
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm transition-transform duration-300 group-hover:translate-x-1 group-active:scale-95">
          <ArrowRight size={17} aria-hidden="true" />
        </span>
        Detayları görüntüle
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={title} size="lg">
        <div className="space-y-5 px-5 pb-6 sm:px-8 sm:pb-8">
          {imageUrl && (
            <div className="flex max-h-72 items-center justify-center rounded-2xl bg-linear-to-br from-amber-50 to-primary-50 p-6">
              <img src={imageUrl} alt="" className="max-h-60 w-auto object-contain" />
            </div>
          )}
          {meta && <p className="text-sm font-medium text-gray-500">{meta}</p>}
          <div className="prose-ys prose-sm" dangerouslySetInnerHTML={{ __html: contentHtml }} />
        </div>
      </Modal>
    </>
  );
}
