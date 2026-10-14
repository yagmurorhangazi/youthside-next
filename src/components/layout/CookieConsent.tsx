/**
 * [MODÜL: ÇEREZ ONAY PANELİ — REACT ISLAND]
 * Amaç: KVKK/GDPR uyumu için kullanıcının çerez tercihini almak.
 *
 * Referans projeyle uyum: Tercih aynı `ys_cookie_consent` anahtarıyla localStorage'da tutulur.
 * Gizli sekmede localStorage erişimi hata verebilir; bu durumda panel yine gösterilir
 * ama tercih kalıcı olmaz (kullanıcı akışı bozulmaz).
 */

import { useEffect, useState } from 'react';
import { Cookie } from '@/shared/ui';
import { ROUTES } from '@/config/site';
import { Button } from '@/shared/ui';

const STORAGE_KEY = 'ys_cookie_consent';
type Consent = 'accepted' | 'rejected';

function readConsent(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeConsent(value: Consent): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Depolama engelliyse tercih yalnızca bu oturum için geçerli olur.
  }
}

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  // SSR'da localStorage yok; kararı tarayıcıda, kısa bir gecikmeyle ver (ilk boyamayı engellemesin).
  useEffect(() => {
    if (readConsent() !== null) return;
    const timer = window.setTimeout(() => setIsVisible(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  const decide = (value: Consent) => {
    writeConsent(value);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Çerez tercihleri"
      className="animate-slide-up fixed inset-x-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl sm:inset-x-auto sm:right-6 sm:max-w-sm lg:bottom-6"
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-xl bg-primary-50 p-3 text-primary-600">
          <Cookie size={22} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="mb-1 font-bold text-gray-900">Çerez Tercihleri</h2>
          <p className="mb-4 text-xs leading-relaxed text-gray-500">
            Deneyiminizi iyileştirmek için çerezleri kullanıyoruz.{' '}
            <a href={ROUTES.agreements('kvkk')} className="font-semibold text-primary-600 underline-offset-2 hover:underline">
              Detaylı bilgi
            </a>
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => decide('rejected')}>
              Reddet
            </Button>
            <Button size="sm" className="flex-1" onClick={() => decide('accepted')}>
              Kabul Et
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
