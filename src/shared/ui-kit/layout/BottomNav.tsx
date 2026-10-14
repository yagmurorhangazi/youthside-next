/**
 * @file Mobil alt navigasyon çubuğu.
 * Author: Ferhat Cengiz
 *
 * Üç kullanım biçimi:
 *   - Sabit grid (varsayılan): ilk `maxItems` öğe + opsiyonel "Daha Fazla" (admin).
 *   - Ortada yüzen oluştur butonu: `centerAction` (ATS şirket paneli).
 *   - `scrollable`: tüm öğeler yatay kaydırılır (çağrı merkezi / cash).
 *
 * Yalnızca md altında görünür; masaüstündeki karşılığı `NavRail`.
 */

import { MoreHorizontal } from 'lucide-react';
import type { NavIcon, NavItem } from './types';
import { activateNavItem } from './navUtils';

export interface BottomNavProps {
  readonly items: readonly NavItem[];
  readonly activeKey?: string | null;
  readonly onNavigate?: (item: NavItem) => void;
  /** Ortada yükseltilmiş yuvarlak aksiyon (ör. "Oluştur"). */
  readonly centerAction?: {
    readonly label: string;
    readonly icon: NavIcon;
    readonly onClick: () => void;
    readonly active?: boolean;
  };
  /** Verilirse son slotta "Daha Fazla"/"Menü" butonu gösterilir. */
  readonly more?: {
    readonly onClick: () => void;
    readonly label?: string;
    readonly icon?: NavIcon;
  };
  /** Grid modunda bar'a sığacak öğe sayısı (fazlası çekmeceye düşmeli). */
  readonly maxItems?: number;
  /** true ise öğeler yatay kaydırılır, `maxItems` uygulanmaz. */
  readonly scrollable?: boolean;
  readonly className?: string;
}

/** Tailwind dinamik sınıf üretmediği için kolon sayıları açık yazılır. */
const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

interface BarButtonProps {
  readonly icon: NavIcon;
  readonly label: string;
  readonly active?: boolean;
  readonly onClick?: () => void;
  readonly badge?: NavItem['badge'];
  readonly scrollable?: boolean;
}

function BarButton({ icon: Icon, label, active = false, onClick, badge, scrollable = false }: BarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex h-full flex-col items-center justify-center gap-1 ${
        scrollable ? 'min-w-[64px] flex-1 rounded-xl py-1.5' : 'w-full'
      } ${active ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
    >
      <span className="relative">
        <Icon size={scrollable ? 20 : 23} strokeWidth={active ? 2.5 : 2} />
        {badge !== undefined && badge !== 0 && badge !== '' && (
          <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-primary-600 px-0.5 text-[8px] font-bold text-white">
            {badge}
          </span>
        )}
      </span>
      <span className={`max-w-full truncate px-0.5 text-[10px] leading-none ${scrollable ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </button>
  );
}

export function BottomNav({
  items,
  activeKey = null,
  onNavigate,
  centerAction,
  more,
  maxItems = 4,
  scrollable = false,
  className = '',
}: BottomNavProps) {
  const base = `fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-slate-200 bg-white pb-safe md:hidden ${className}`;

  if (scrollable) {
    if (items.length <= 1 && !more) return null;
    return (
      <nav className={`${base} no-scrollbar flex items-center gap-1 overflow-x-auto px-2`}>
        {items.map((item) => (
          <BarButton
            key={item.key}
            scrollable
            icon={item.icon}
            label={item.label}
            badge={item.badge}
            active={item.key === activeKey}
            onClick={() => activateNavItem(item, onNavigate)}
          />
        ))}
        {more && <BarButton scrollable icon={more.icon ?? MoreHorizontal} label={more.label ?? 'Daha Fazla'} onClick={more.onClick} />}
      </nav>
    );
  }

  const visible = items.slice(0, maxItems);
  const slots = [
    ...visible.map((item) => (
      <BarButton
        key={item.key}
        icon={item.icon}
        label={item.label}
        badge={item.badge}
        active={item.key === activeKey}
        onClick={() => activateNavItem(item, onNavigate)}
      />
    )),
    ...(more ? [<BarButton key="__more" icon={more.icon ?? MoreHorizontal} label={more.label ?? 'Daha Fazla'} onClick={more.onClick} />] : []),
  ];

  if (centerAction) {
    const CenterIcon = centerAction.icon;
    slots.splice(
      Math.floor(slots.length / 2),
      0,
      <div key="__center" className="relative -top-5 flex justify-center">
        <button
          type="button"
          onClick={centerAction.onClick}
          aria-label={centerAction.label}
          className={`rounded-full p-4 text-white shadow-lg ${
            centerAction.active ? 'bg-primary-700 shadow-primary-700/30' : 'bg-primary-600 shadow-primary-600/30'
          }`}
        >
          <CenterIcon size={26} />
        </button>
      </div>,
    );
  }

  return <nav className={`${base} grid items-center ${GRID_COLS[slots.length] ?? 'grid-cols-5'}`}>{slots}</nav>;
}
