/**
 * @file Mobil alttan açılan menü çekmecesi ("Menü" / "Daha Fazla").
 * Author: Ferhat Cengiz
 *
 * Alt bar'a sığmayan modülleri ve profil/ayar/destek gibi ikincil bağlantıları
 * taşır. Başlıkta kullanıcı özeti, en altta kırmızı Çıkış aksiyonu bulunur.
 * Escape ve arka plana tıklama kapatır.
 */

import { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';
import type { NavIcon, NavItem, UserSummary } from './types';
import { activateNavItem } from './navUtils';
import { UserAvatar } from './UserAvatar';

export interface MobileMenuSheetProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly user?: UserSummary;
  /** Ana modül listesi. */
  readonly items: readonly NavItem[];
  /** Çizgiyle ayrılan hesap bağlantıları (Profilim, Ayarlar…). */
  readonly secondaryItems?: readonly NavItem[];
  readonly activeKey?: string | null;
  readonly onNavigate?: (item: NavItem) => void;
  readonly onLogout?: () => void;
  readonly logoutLabel?: string;
}

interface SheetItemProps {
  readonly icon: NavIcon;
  readonly label: string;
  readonly active?: boolean;
  readonly danger?: boolean;
  readonly onClick: () => void;
}

function SheetItem({ icon: Icon, label, active = false, danger = false, onClick }: SheetItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
        danger ? 'text-rose-600 hover:bg-rose-50' : active ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          danger ? 'bg-rose-50 text-rose-500' : active ? 'bg-white text-primary-600' : 'bg-slate-100 text-slate-400'
        }`}
      >
        <Icon size={19} />
      </span>
      <span className="text-sm font-bold">{label}</span>
    </button>
  );
}

export function MobileMenuSheet({
  isOpen,
  onClose,
  user,
  items,
  secondaryItems = [],
  activeKey = null,
  onNavigate,
  onLogout,
  logoutLabel = 'Çıkış Yap',
}: MobileMenuSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const open = (item: NavItem) => {
    activateNavItem(item, onNavigate);
    onClose();
  };

  const renderItem = (item: NavItem) => (
    <SheetItem
      key={item.key}
      icon={item.icon}
      label={item.label}
      danger={item.danger}
      active={item.key === activeKey}
      onClick={() => open(item)}
    />
  );

  return (
    <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label="Menü">
      <button type="button" className="absolute inset-0 bg-slate-950/30" onClick={onClose} aria-label="Menüyü kapat" />

      <aside className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-y-auto rounded-t-3xl border border-slate-100 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          {user ? (
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar name={user.name} src={user.avatarSrc} fit={user.avatarFit} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">{user.name}</p>
                {(user.subtitle ?? user.email) && (
                  <p className="truncate text-[11px] font-semibold text-slate-400">{user.subtitle ?? user.email}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm font-black text-slate-900">Menü</p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Menüyü kapat"
          >
            <X size={20} />
          </button>
        </div>

        {items.length > 0 && <nav className="space-y-1 px-4 py-4">{items.map(renderItem)}</nav>}

        {(secondaryItems.length > 0 || onLogout) && (
          <div className="space-y-1 border-t border-slate-100 px-4 py-4 pb-6">
            {secondaryItems.map(renderItem)}
            {onLogout && (
              <SheetItem
                icon={LogOut}
                label={logoutLabel}
                danger
                onClick={() => {
                  onClose();
                  onLogout();
                }}
              />
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
