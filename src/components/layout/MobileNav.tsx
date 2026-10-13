/**
 * [MODÜL: MOBİL NAVİGASYON — REACT ISLAND]
 * Amaç: Telefonda başparmak erişimine uygun alt panel, tablette daha dengeli sağ panel sunmak.
 * Neden uyarlanır: Aynı tam genişlikte panel tablet ekranında gereğinden büyük kaldığı için açılma
 *                  yönü `sm` eşiğinde değişir; içerik ve etkileşim mantığı tek island'da kalır.
 *
 * Erişilebilirlik: Escape ve arka plana dokunma ile kapanır, açıkken sayfa kaydırması kilitlenir,
 *                  odak panele taşınır ve kapanınca menü düğmesine geri döner.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Home, LogIn, LogOut, Menu, Sparkles, X } from 'lucide-react';
import { ACCOUNT_NAV, MAIN_NAV, ROUTES, SITE } from '@/config/site';
import type { SessionUser } from '@/features/auth/types';
import { ButtonLink, UserAvatar, isPathActive } from '@/shared/ui';

interface MobileNavProps {
  readonly user: SessionUser | null;
  readonly currentPath: string;
  readonly loginHref: string;
}

/** Ana keşif kartlarının aktif/pasif görünümünü tek kaynaktan üretir. */
function discoveryLinkClass(active: boolean): string {
  return `group flex min-h-24 flex-col justify-between rounded-2xl border p-3.5 transition duration-200 active:scale-[0.98] ${
    active
      ? 'border-primary-200 bg-primary-50 text-primary-800 shadow-sm'
      : 'border-slate-100 bg-slate-50/70 text-slate-700 hover:border-primary-100 hover:bg-white hover:shadow-soft'
  }`;
}

/** Hesap linkleri daha yoğun bir liste düzeni kullanır; görsel kurallar burada ortak kalır. */
function accountLinkClass(active: boolean): string {
  return `flex min-h-12 items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold transition-colors ${
    active ? 'bg-primary-50 text-primary-800' : 'text-slate-700 hover:bg-slate-50'
  }`;
}

export default function MobileNav({ user, currentPath, loginHref }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const drawerId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);
  const homeActive = currentPath === ROUTES.home;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Menüyü aç"
        aria-expanded={isOpen}
        aria-controls={drawerId}
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 active:scale-95 lg:hidden"
      >
        <Menu size={21} strokeWidth={2.25} aria-hidden="true" />
      </button>

      <div
        onClick={close}
        aria-hidden="true"
        className={`fixed inset-0 z-90 bg-slate-950/45 backdrop-blur-[3px] transition-opacity duration-300 ease-smooth lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <nav
        ref={panelRef}
        id={drawerId}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Mobil navigasyon"
        inert={!isOpen}
        className={`fixed inset-x-0 bottom-0 z-100 flex max-h-[calc(100dvh-0.75rem)] w-full flex-col overflow-hidden rounded-t-[2rem] border-x border-t border-white/70 bg-white shadow-2xl outline-none transition-transform duration-[380ms] ease-smooth sm:inset-y-0 sm:left-auto sm:right-0 sm:h-dvh sm:max-h-none sm:w-[26rem] sm:rounded-none sm:border-y-0 sm:border-l sm:border-r-0 lg:hidden ${
          isOpen ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-x-full sm:translate-y-0'
        }`}
      >
        <div className="flex justify-center pb-1 pt-2.5 sm:hidden" aria-hidden="true">
          <span className="h-1 w-11 rounded-full bg-slate-200" />
        </div>

        <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-2">
          {user ? (
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar name={user.name} src={user.avatarUrl} className="rounded-2xl ring-1 ring-slate-200" />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-slate-900">{user.name}</p>
                {user.email && <p className="truncate text-xs text-slate-400">{user.email}</p>}
              </div>
            </div>
          ) : (
            <div>
              <img src={SITE.logo} alt={`${SITE.name} logo`} className="w-[116px]" />
              <p className="mt-1 text-xs font-medium text-slate-400">Kariyer yolculuğun burada başlar.</p>
            </div>
          )}
          <button
            type="button"
            onClick={close}
            aria-label="Menüyü kapat"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
          >
            <X size={20} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4">
          <a
            href={ROUTES.home}
            onClick={close}
            aria-current={homeActive ? 'page' : undefined}
            className={`mb-3 flex min-h-12 items-center gap-3 rounded-2xl border px-3.5 text-sm font-bold transition-colors ${
              homeActive
                ? 'border-primary-200 bg-primary-50 text-primary-800'
                : 'border-slate-100 bg-white text-slate-700 hover:border-primary-100 hover:bg-primary-50/50'
            }`}
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${homeActive ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
              <Home size={17} strokeWidth={2.25} aria-hidden="true" />
            </span>
            Ana sayfa
            <ArrowRight size={16} className="ml-auto text-slate-300" aria-hidden="true" />
          </a>

          <p className="mb-2 px-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Keşfet</p>
          <ul className="grid grid-cols-2 gap-2.5">
            {MAIN_NAV.map(({ label, href, icon: Icon }) => {
              const active = isPathActive(href, currentPath);
              return (
                <li key={href}>
                  <a href={href} onClick={close} className={discoveryLinkClass(active)} aria-current={active ? 'page' : undefined}>
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                        active ? 'bg-primary-700 text-white' : 'bg-white text-slate-500 shadow-sm group-hover:text-primary-700'
                      }`}
                    >
                      <Icon size={18} strokeWidth={2.15} aria-hidden="true" />
                    </span>
                    <span className="flex items-center justify-between gap-2 text-sm font-bold">
                      {label}
                      <ArrowRight size={15} className={active ? 'text-primary-500' : 'text-slate-300'} aria-hidden="true" />
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>

          {user && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-1 px-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Hesabım</p>
              <ul className="grid gap-0.5 sm:grid-cols-2">
                {ACCOUNT_NAV.map(({ label, href, icon: Icon }) => {
                  const active = isPathActive(href, currentPath);
                  return (
                    <li key={href}>
                      <a href={href} onClick={close} className={accountLinkClass(active)} aria-current={active ? 'page' : undefined}>
                        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${active ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'}`}>
                          <Icon size={17} strokeWidth={2.15} aria-hidden="true" />
                        </span>
                        {label}
                      </a>
                    </li>
                  );
                })}
                <li>
                  <form method="post" action={ROUTES.logout}>
                    <button type="submit" className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50">
                        <LogOut size={17} strokeWidth={2.15} aria-hidden="true" />
                      </span>
                      Çıkış Yap
                    </button>
                  </form>
                </li>
              </ul>
            </div>
          )}
        </div>

        {!user && (
          <div className="border-t border-slate-100 bg-slate-50/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                <Sparkles size={15} strokeWidth={2.25} aria-hidden="true" />
              </span>
              Fırsatları kaydetmek ve başvurmak için hesabını oluştur.
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <ButtonLink href={loginHref} variant="outline" icon={LogIn} className="w-full bg-white">Giriş Yap</ButtonLink>
              <ButtonLink href={ROUTES.register} className="w-full">Kayıt Ol</ButtonLink>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
