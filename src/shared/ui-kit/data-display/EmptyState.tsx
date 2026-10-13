/**
 * @file Veri yokken gösterilen boş durum bileşeni.
 * Author: Ferhat Cengiz
 */

import type { ReactNode } from 'react';
import type { NavIcon } from '../layout/types';

export interface EmptyStateProps {
  readonly icon: NavIcon;
  readonly title: string;
  readonly description?: ReactNode;
  readonly action?: ReactNode;
  /** Kart/tablo içinde daha az dikey boşlukla göstermek için. */
  readonly compact?: boolean;
  readonly className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, compact = false, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 text-center ${compact ? 'py-10' : 'py-20'} ${className}`}>
      <div className={`mb-6 flex items-center justify-center rounded-3xl bg-slate-50 ${compact ? 'h-14 w-14' : 'h-20 w-20'}`}>
        <Icon size={compact ? 26 : 36} className="text-slate-300" />
      </div>
      <h3 className="mb-2 text-lg font-black text-slate-700">{title}</h3>
      {description && <p className="max-w-md text-sm leading-relaxed text-slate-400">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
