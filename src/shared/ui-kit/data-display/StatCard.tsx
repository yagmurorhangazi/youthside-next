/**
 * @file Tek bir KPI metriğini gösteren istatistik kartı.
 * Author: Ferhat Cengiz
 *
 * Veri hesaplama dışarıda yapılır; kart yalnızca render eder.
 */

import { TrendingDown, TrendingUp } from 'lucide-react';
import type { NavIcon } from '../layout/types';

export type StatCardColor = 'primary' | 'emerald' | 'amber' | 'blue' | 'rose' | 'violet' | 'slate';

export interface StatCardProps {
  readonly icon: NavIcon;
  readonly label: string;
  readonly value: string | number;
  /** Değerin yanında küçük yeşil not (ör. "+12 bugün"). */
  readonly helperText?: string;
  /** Yüzde değişim; `isPositive` rengi ve oku belirler. */
  readonly trend?: { readonly value: number; readonly isPositive: boolean };
  readonly color?: StatCardColor;
  /** Değer yerine iskelet göstermek için. */
  readonly isLoading?: boolean;
  readonly onClick?: () => void;
  readonly className?: string;
}

const COLOR_MAP: Record<StatCardColor, { bg: string; icon: string; border: string }> = {
  primary: { bg: 'bg-primary-50', icon: 'text-primary-500', border: 'border-primary-100' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500', border: 'border-emerald-100' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-500', border: 'border-amber-100' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-500', border: 'border-blue-100' },
  rose: { bg: 'bg-rose-50', icon: 'text-rose-500', border: 'border-rose-100' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-500', border: 'border-violet-100' },
  slate: { bg: 'bg-slate-50', icon: 'text-slate-500', border: 'border-slate-100' },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  helperText,
  trend,
  color = 'primary',
  isLoading = false,
  onClick,
  className = '',
}: StatCardProps) {
  const c = COLOR_MAP[color];
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`block w-full rounded-[20px] border bg-white p-6 text-left shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-lg ${c.border} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${c.bg}`}>
          <Icon size={22} className={c.icon} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold ${trend.isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{trend.value}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
          {isLoading ? (
            <span className="block h-8 w-20 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <p className="text-2xl font-black tracking-tight text-slate-800">{value}</p>
          )}
          {helperText && !isLoading && <p className="pb-1 text-[11px] font-bold text-emerald-500">{helperText}</p>}
        </div>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      </div>
    </Wrapper>
  );
}
