/**
 * @file Üst bar (navbar) iskeleti.
 * Author: Ferhat Cengiz
 *
 * Sol: `leading` (breadcrumb, sayfa başlığı ya da global arama).
 * Sağ: `actions` (hızlı aksiyonlar, bildirim, modül geçişi) + `user` (UserMenu).
 * İçerik tamamen slot'larla verilir; header kendisi hiçbir veri bilmez.
 */

import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';

export interface AppHeaderProps {
  readonly leading?: ReactNode;
  readonly actions?: ReactNode;
  readonly user?: ReactNode;
  /** Verilirse mobilde solda hamburger butonu gösterilir. */
  readonly onOpenMobileMenu?: () => void;
  readonly className?: string;
}

export function AppHeader({ leading, actions, user, onOpenMobileMenu, className = '' }: AppHeaderProps) {
  return (
    <header
      className={`z-40 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 backdrop-blur-xl transition-all duration-300 sm:px-8 ${className}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Menüyü aç"
            className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 md:hidden"
          >
            <Menu size={20} />
          </button>
        )}
        {leading}
      </div>

      {(actions || user) && (
        <div className="ml-3 flex shrink-0 items-center gap-2 sm:gap-4">
          {actions}
          {actions && user && <div className="mx-1 hidden h-5 w-px bg-slate-200 md:block" />}
          {user}
        </div>
      )}
    </header>
  );
}

export interface HeaderIconButtonProps {
  readonly icon: ReactNode;
  readonly label: string;
  readonly onClick?: () => void;
  /** Sağ üstte sayı rozeti (0 ise gizli). */
  readonly count?: number;
  readonly className?: string;
}

/** Header'daki yuvarlak ikon butonu (bildirim, yeni e-posta, arka plan işleri). */
export function HeaderIconButton({ icon, label, onClick, count, className = '' }: HeaderIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`relative rounded-full p-2 text-slate-500 transition-all hover:bg-slate-100 active:scale-90 ${className}`}
    >
      {icon}
      {count !== undefined && count > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-primary-600 px-0.5 text-[9px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
