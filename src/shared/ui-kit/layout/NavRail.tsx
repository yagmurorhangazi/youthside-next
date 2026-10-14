/**
 * @file Masaüstü sol navigasyon çubuğu (Navigation Rail).
 * Author: Ferhat Cengiz
 *
 * İki görünüm:
 *   - `labeled` (varsayılan, 112px): ikon + etiket, aktif öğe dolu primary.
 *     ATS admin, çağrı merkezi ve cash panellerinin rail'i.
 *   - `compact` (68px): yalnız ikon, etiket hover'da; aktif öğe açık primary + glow.
 *     ATS şirket panelinin rail'i.
 *
 * Yalnızca md ve üstünde görünür; mobilde karşılığı `BottomNav` + `MobileMenuSheet`.
 * Rail `fixed` konumlanır — içerik alanını `AppShell` (ya da `NAV_RAIL_OFFSET`) iter.
 */

import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import type { NavBrand, NavItem, UserSummary } from './types';
import { activateNavItem } from './navUtils';
import { UserAvatar } from './UserAvatar';

export type NavRailVariant = 'labeled' | 'compact';

/** İçerik alanının rail genişliği kadar itilmesi için kullanılacak sınıflar. */
export const NAV_RAIL_OFFSET: Record<NavRailVariant, string> = {
  labeled: 'md:ml-28',
  compact: 'md:ml-[68px]',
};

export interface NavRailProps {
  /** Görünür ana menü öğeleri (yetki filtresi tüketicide uygulanmış olmalı). */
  readonly items: readonly NavItem[];
  /** Rail'in altına sabitlenen öğeler (ör. Destek, Ayarlar). */
  readonly bottomItems?: readonly NavItem[];
  readonly activeKey?: string | null;
  readonly onNavigate?: (item: NavItem) => void;
  readonly variant?: NavRailVariant;
  readonly brand?: NavBrand;
  /** En alta profil avatarı (compact görünümde ATS'deki gibi). */
  readonly profile?: {
    readonly user: UserSummary;
    readonly onClick?: () => void;
    readonly online?: boolean;
  };
  /** Verilirse en altta kırmızı çıkış butonu gösterilir. */
  readonly onLogout?: () => void;
  readonly logoutLabel?: string;
  /** Alt bölüme eklenecek serbest içerik. */
  readonly footer?: ReactNode;
  readonly className?: string;
}

interface RailItemProps {
  readonly item: NavItem;
  readonly active: boolean;
  readonly variant: NavRailVariant;
  readonly onClick: () => void;
}

function RailBadge({ value, active }: { value: NavItem['badge']; active: boolean }) {
  if (value === undefined || value === 0 || value === '') return null;
  return (
    <span
      className={`absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 px-1 text-[8px] font-bold ${
        active ? 'border-primary-600 bg-white text-primary-700' : 'border-white bg-primary-600 text-white'
      }`}
    >
      {value}
    </span>
  );
}

function RailItem({ item, active, variant, onClick }: RailItemProps) {
  const Icon = item.icon;

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onClick}
        title={item.label}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        className={`group relative mx-auto mb-2 flex h-14 w-14 cursor-pointer flex-col items-center justify-center rounded-xl outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary-500/30 ${
          active ? 'rail-active-glow bg-primary-50 text-primary-700' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
        }`}
      >
        <span className="relative">
          <Icon size={22} strokeWidth={active ? 2.5 : 2} />
          <RailBadge value={item.badge} active={false} />
        </span>
        <span
          className={`absolute -bottom-1 hidden whitespace-nowrap text-[9px] font-semibold leading-none opacity-0 transition-opacity group-hover:opacity-100 lg:block ${
            active ? 'text-primary-700 opacity-100' : 'text-slate-500'
          }`}
        >
          {item.label}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={item.label}
      aria-current={active ? 'page' : undefined}
      className={`group flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl px-1 py-3 outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary-500/30 ${
        active ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <span className="relative mb-0.5">
        <Icon
          size={24}
          strokeWidth={active ? 2.5 : 2}
          className={`transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}
        />
        <RailBadge value={item.badge} active={active} />
      </span>
      <span className="text-center text-[10px] font-bold leading-tight tracking-wide">{item.label}</span>
    </button>
  );
}

export function NavRail({
  items,
  bottomItems = [],
  activeKey = null,
  onNavigate,
  variant = 'labeled',
  brand,
  profile,
  onLogout,
  logoutLabel = 'Çıkış Yap',
  footer,
  className = '',
}: NavRailProps) {
  const isCompact = variant === 'compact';
  const renderItem = (item: NavItem) => (
    <RailItem
      key={item.key}
      item={item}
      variant={variant}
      active={item.key === activeKey}
      onClick={() => activateNavItem(item, onNavigate)}
    />
  );

  const hasFooter = bottomItems.length > 0 || Boolean(profile) || Boolean(onLogout) || Boolean(footer);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 hidden flex-col border-r bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 md:flex ${
        isCompact ? 'w-[68px] items-center border-slate-200/60 py-5' : 'w-28 border-slate-100'
      } ${className}`}
    >
      {/* ── Marka ── */}
      {brand &&
        (isCompact ? (
          <button
            type="button"
            onClick={brand.onClick}
            className="mb-8 cursor-pointer transition-all hover:scale-110 active:scale-95"
          >
            <img src={brand.logoSrc} alt={brand.alt ?? 'Youthside'} className="h-9 w-9 rounded-lg shadow-sm" />
          </button>
        ) : (
          <div className="flex h-24 shrink-0 flex-col items-center justify-center gap-1 border-b border-slate-50">
            <button type="button" onClick={brand.onClick} className="cursor-pointer transition-opacity hover:opacity-80">
              <img
                src={brand.logoSrc}
                alt={brand.alt ?? 'Youthside'}
                className={`h-auto object-contain ${brand.subtitle ? 'w-12 rounded-xl' : 'w-14'}`}
              />
            </button>
            {brand.subtitle && (
              <span className="text-[9px] font-black uppercase tracking-widest text-primary-600">{brand.subtitle}</span>
            )}
          </div>
        ))}

      {/* ── Ana navigasyon ── */}
      {isCompact ? (
        <nav className="no-scrollbar flex w-full flex-1 flex-col items-center space-y-1 overflow-y-auto">
          {items.map(renderItem)}
          {bottomItems.length > 0 && <div className="my-3 h-px w-8 bg-slate-100" />}
        </nav>
      ) : (
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Üst/alt fade: listede kaydırılacak içerik olduğunu sezdirir. */}
          <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-6 bg-gradient-to-b from-white to-transparent" />
          <nav className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-3 py-6 pb-10">{items.map(renderItem)}</nav>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-12 bg-gradient-to-t from-white to-transparent" />
        </div>
      )}

      {/* ── Alt bölüm ── */}
      {hasFooter && (
        <div
          className={
            isCompact
              ? 'flex w-full flex-col items-center space-y-3 border-t border-slate-100 pt-4'
              : 'flex flex-col items-center gap-3 border-t border-slate-50 bg-slate-50/50 p-4'
          }
        >
          {bottomItems.length > 0 && (
            <div className={isCompact ? 'flex w-full flex-col items-center' : 'w-full space-y-2'}>
              {bottomItems.map(renderItem)}
            </div>
          )}
          {footer}
          {profile && (
            <button
              type="button"
              onClick={profile.onClick}
              title={profile.user.name}
              className="group pb-2 transition-transform active:scale-90"
            >
              <UserAvatar
                name={profile.user.name}
                src={profile.user.avatarSrc}
                fit={profile.user.avatarFit}
                online={profile.online ?? true}
                className="transition-transform group-hover:scale-105"
              />
            </button>
          )}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title={logoutLabel}
              aria-label={logoutLabel}
              className="group cursor-pointer rounded-full p-3 text-red-500 transition-colors hover:bg-red-50"
            >
              <LogOut size={22} className="transition-transform group-hover:scale-110" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
