/**
 * [MODÜL: KULLANICI MENÜSÜ — REACT ISLAND]
 * Amaç: Giriş yapmış kullanıcının avatarı ve hesap kısayollarını içeren açılır menü.
 * Neden island: Açma/kapama, dışarı tıklama ve Escape davranışı istemci tarafında çalışmalı.
 *
 * Not: Menü öğeleri prop olarak değil config'den alınır; ikon bileşenleri (fonksiyon)
 * Astro → React island sınırında serileştirilemez.
 */

import { useCallback, useId, useRef, useState } from 'react';
import { ChevronDown, LogOut } from '@/shared/ui';
import { ACCOUNT_NAV, ROUTES } from '@/config/site';
import type { SessionUser } from '@/features/auth/types';
import { POPOVER_PANEL, UserAvatar, useClickOutside } from '@/shared/ui';

interface UserMenuProps {
  readonly user: SessionUser;
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setIsOpen(false), []);
  useClickOutside(containerRef, isOpen, close);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        className="group flex items-center gap-2 rounded-full p-0.5 sm:gap-3 sm:pr-2"
      >
        <UserAvatar name={user.name} src={user.avatarUrl} className="ring-2 ring-primary-100 rounded-full transition group-hover:ring-primary-300" />
        <span className="hidden max-w-[120px] truncate text-sm font-semibold text-gray-700 transition-colors group-hover:text-primary-600 md:block">
          {user.name}
        </span>
        <ChevronDown
          size={18}
          className={`hidden text-gray-400 transition-transform group-hover:text-primary-500 sm:block ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          className={`absolute right-0 z-50 mt-3 w-72 origin-top-right ${POPOVER_PANEL}`}
        >
          {/* Kullanıcı bilgi başlığı */}
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 pb-4 pt-5">
            <UserAvatar name={user.name} src={user.avatarUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-gray-900">{user.name}</p>
              {user.email && <p className="truncate text-xs text-gray-400">{user.email}</p>}
            </div>
          </div>

          {/* Hesap kısayolları */}
          <div className="py-2">
            {ACCOUNT_NAV.map(({ label, href, icon: Icon }) => (
              <a
                key={href}
                href={href}
                role="menuitem"
                className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-primary-50 hover:text-primary-700"
              >
                <Icon size={18} className="text-gray-400" aria-hidden="true" />
                {label}
              </a>
            ))}
          </div>

          {/* Çıkış POST ile yapılır: GET linki başka sitelerden tetiklenebilirdi (CSRF). */}
          <form method="post" action={ROUTES.logout} className="border-t border-gray-100 p-2">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"
            >
              <LogOut size={18} aria-hidden="true" />
              Çıkış Yap
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
