/**
 * @file Header sağındaki profil tetikleyicisi + açılır kullanıcı menüsü.
 * Author: Ferhat Cengiz
 *
 * ATS şirket header'ı, admin header'ı, çağrı merkezi ve cash header'larındaki
 * profil dropdown'larının ortak hâli: kullanıcı özeti, rol etiketleri,
 * menü bağlantıları ve kırmızı Çıkış aksiyonu.
 */

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import type { NavItem, UserSummary } from './types';
import { activateNavItem } from './navUtils';
import { UserAvatar } from './UserAvatar';
import { useClickOutside } from '../hooks/useClickOutside';

export interface UserMenuProps {
  readonly user: UserSummary;
  /** Profil, Ayarlar, Yardım gibi bağlantılar. */
  readonly items?: readonly NavItem[];
  readonly onNavigate?: (item: NavItem) => void;
  readonly onLogout?: () => void;
  readonly logoutLabel?: string;
  /** Dropdown başlığı ile öğeler arasına eklenecek serbest içerik (ör. yalnız mobilde görünen bağlantı). */
  readonly extra?: ReactNode;
  readonly className?: string;
}

export function UserMenu({
  user,
  items = [],
  onNavigate,
  onLogout,
  logoutLabel = 'Çıkış Yap',
  extra,
  className = '',
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  const secondary = user.subtitle ?? user.email;

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 transition-all hover:bg-slate-50"
      >
        <UserAvatar name={user.name} src={user.avatarSrc} fit={user.avatarFit} size="sm" />
        <span className="hidden text-left md:block">
          <span className="block max-w-[180px] truncate text-sm font-bold leading-tight text-slate-700">{user.name}</span>
          {secondary && <span className="block max-w-[180px] truncate text-[10px] text-slate-400">{secondary}</span>}
        </span>
        <ChevronDown size={14} className={`hidden text-slate-400 transition-transform md:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-dropdown-in absolute right-0 top-full z-[100] mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl"
        >
          <div className="border-b border-slate-100 bg-slate-50/50 p-4">
            <div className="flex items-center gap-3">
              <UserAvatar name={user.name} src={user.avatarSrc} fit={user.avatarFit} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{user.name}</p>
                {user.email && <p className="mt-0.5 truncate text-[11px] text-slate-400">{user.email}</p>}
                {user.subtitle && user.email && <p className="truncate text-[11px] text-slate-400">{user.subtitle}</p>}
                {user.subtitle && !user.email && <p className="mt-0.5 truncate text-[11px] text-slate-400">{user.subtitle}</p>}
              </div>
            </div>
            {user.roles && user.roles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {user.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-md bg-primary-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-600"
                  >
                    {role}
                  </span>
                ))}
              </div>
            )}
          </div>

          {extra}

          {items.length > 0 && (
            <div className="p-2">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      close();
                      activateNavItem(item, onNavigate);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                      item.danger ? 'hover:bg-rose-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={18} className={item.danger ? 'text-rose-500' : 'text-slate-400'} />
                    <span className={`text-sm font-medium ${item.danger ? 'text-rose-600' : 'text-slate-700'}`}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {onLogout && (
            <>
              <div className="h-px bg-slate-100" />
              <div className="p-2">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    onLogout();
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:bg-rose-50"
                >
                  <LogOut size={18} className="text-rose-500" />
                  <span className="text-sm font-medium text-rose-600 group-hover:text-rose-700">{logoutLabel}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
