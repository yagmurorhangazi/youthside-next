/**
 * @file Header'daki "Hızlı Yayınla" tarzı buton + açıklamalı aksiyon listesi.
 * Author: Ferhat Cengiz
 */

import { useCallback, useRef, useState } from 'react';
import { Plus, type LucideIcon } from 'lucide-react';
import type { NavIcon } from './types';
import { Button } from '../primitives/Button';
import { useClickOutside } from '../hooks/useClickOutside';

export interface QuickAction {
  readonly key: string;
  readonly title: string;
  readonly description?: string;
  readonly icon: NavIcon;
  readonly onSelect: () => void;
  /** true ise ikon kutusu vurgulu (primary) görünür — listedeki birincil aksiyon. */
  readonly highlighted?: boolean;
}

export interface QuickActionMenuProps {
  readonly actions: readonly QuickAction[];
  readonly label?: string;
  readonly icon?: LucideIcon;
  readonly className?: string;
}

export function QuickActionMenu({ actions, label = 'Hızlı Yayınla', icon = Plus, className = '' }: QuickActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  if (actions.length === 0) return null;

  return (
    <div className={`relative ${className}`} ref={ref}>
      <Button
        variant="primary"
        size="sm"
        icon={icon}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-full px-5 shadow-lg shadow-primary-500/20"
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </Button>

      {open && (
        <div
          role="menu"
          className="animate-dropdown-in absolute right-0 top-full z-[100] mt-3 w-64 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl"
        >
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <div key={action.key}>
                {index > 0 && <div className="my-1 h-px bg-slate-100" />}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    action.onSelect();
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:bg-primary-50"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      action.highlighted
                        ? 'bg-primary-50 text-primary-600 group-hover:bg-primary-100'
                        : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-primary-600'
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-800 group-hover:text-primary-700">{action.title}</span>
                    {action.description && <span className="block text-[11px] text-slate-400">{action.description}</span>}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
