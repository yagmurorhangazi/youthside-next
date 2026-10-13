/**
 * [MODÜL: MOBİL NAVİGASYON — REACT ISLAND]
 * Amaç: Mobil/tablette hamburger butonu ve soldan kayan menü çekmecesi.
 * Neden tek bileşen: Buton ile çekmece aynı açık/kapalı durumunu paylaşır; ayrı island
 *                    olsalardı durum için global olay köprüsü gerekirdi (gereksiz karmaşıklık).
 *
 * Erişilebilirlik: Escape ile kapanır, açıkken sayfa kaydırması kilitlenir,
 *                  çekmece `role="dialog"` + `aria-modal` olarak duyurulur.
 */

import { useEffect, useId, useState } from 'react';
import { LogIn, LogOut, Menu, X } from 'lucide-react';
import { ACCOUNT_NAV, MAIN_NAV, ROUTES, SITE } from '@/config/site';
import type { SessionUser } from '@/features/auth/types';
import { ButtonLink, UserAvatar, isPathActive } from '@/shared/ui';

interface MobileNavProps {
  readonly user: SessionUser | null;
  readonly currentPath: string;
  readonly loginHref: string;
}

/** Çekmece içindeki tek satırlık link stili (DRY: ana menü ve hesap menüsü aynı görünümü kullanır). */
function drawerLinkClass(active: boolean): string {
  return `flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors ${
    active ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
  }`;
}

export default function MobileNav({ user, currentPath, loginHref }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const drawerId = useId();

  // Açıkken arka plan kaymasın; Escape ile kapansın.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setIsOpen(false);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Menüyü aç"
        aria-expanded={isOpen}
        aria-controls={drawerId}
        className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-gray-100 lg:hidden"
      >
        <Menu size={24} aria-hidden="true" />
      </button>

      {/* Karartma katmanı */}
      <div
        onClick={close}
        aria-hidden="true"
        className={`fixed inset-0 z-60 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ease-smooth lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Çekmece */}
      <nav
        id={drawerId}
        role="dialog"
        aria-modal="true"
        aria-label="Mobil navigasyon"
        inert={!isOpen}
        className={`fixed inset-y-0 left-0 z-70 flex w-[85vw] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-[400ms] ease-smooth lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Başlık: kullanıcı özeti veya logo */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          {user ? (
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar name={user.name} src={user.avatarUrl} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-800">{user.name}</p>
                {user.email && <p className="truncate text-xs text-gray-400">{user.email}</p>}
              </div>
            </div>
          ) : (
            <img src={SITE.logo} alt={`${SITE.name} logo`} className="w-[120px]" />
          )}
          <button
            type="button"
            onClick={close}
            aria-label="Menüyü kapat"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        {/* Linkler */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {MAIN_NAV.map(({ label, href, icon: Icon }) => {
              const active = isPathActive(href, currentPath);
              return (
                <li key={href}>
                  <a href={href} className={drawerLinkClass(active)} aria-current={active ? 'page' : undefined}>
                    <Icon size={20} className={active ? 'text-primary-600' : 'text-gray-400'} aria-hidden="true" />
                    {label}
                  </a>
                </li>
              );
            })}
          </ul>

          {user && (
            <>
              <p className="mt-6 px-4 pb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Hesabım</p>
              <ul className="space-y-1">
                {ACCOUNT_NAV.map(({ label, href, icon: Icon }) => {
                  const active = isPathActive(href, currentPath);
                  return (
                    <li key={href}>
                      <a href={href} className={drawerLinkClass(active)} aria-current={active ? 'page' : undefined}>
                        <Icon size={20} className={active ? 'text-primary-600' : 'text-gray-400'} aria-hidden="true" />
                        {label}
                      </a>
                    </li>
                  );
                })}
                <li>
                  <form method="post" action={ROUTES.logout}>
                    <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-semibold text-red-500 hover:bg-red-50">
                      <LogOut size={20} aria-hidden="true" />
                      Çıkış Yap
                    </button>
                  </form>
                </li>
              </ul>
            </>
          )}
        </div>

        {/* Misafir aksiyonları — başparmak erişimi için altta */}
        {!user && (
          <div className="grid gap-2 border-t border-gray-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <ButtonLink href={ROUTES.register} className="w-full">Kayıt Ol</ButtonLink>
            <ButtonLink href={loginHref} variant="outline" icon={LogIn} className="w-full">Giriş Yap</ButtonLink>
          </div>
        )}
      </nav>
    </>
  );
}
