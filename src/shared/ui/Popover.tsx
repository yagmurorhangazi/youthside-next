/**
 * [MODÜL: AÇILIR PANEL SİSTEMİ — UI KIT GENİŞLETMESİ]
 * Amaç: Sitedeki tüm açılır kontrollerin (filtreler, sıralama, kullanıcı menüsü) tek görsel dili.
 *
 * Parçalar:
 *   - ToolbarButton : Araç çubuğu butonu (ikon + etiket + sayaç + ok). Boş / açık / aktif durumları.
 *   - Popover       : Tetikleyiciye bağlı panel. Dışarı tıklama, Escape ve odak geri dönüşü burada.
 *   - SelectMenu    : Tekli seçim menüsü (yerel <select> yerine; ok tuşlarıyla gezilebilir).
 *   - POPOVER_PANEL : Panel yüzey sınıfı (başka menüler de aynı yüzeyi kullanır — DRY).
 *
 * Neden: Her bileşen kendi buton/panel stilini yazınca site "klasik" ve tutarsız görünüyordu.
 */

import { forwardRef, useCallback, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown, type AppIcon } from './icons';
import { useClickOutside } from '../ui-kit';

/** Açılır panellerin ortak yüzeyi: yumuşak derin gölge + ince çerçeve + giriş animasyonu. */
export const POPOVER_PANEL =
  'animate-pop-in overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-16px_rgb(15_23_42/0.32),0_4px_12px_-4px_rgb(15_23_42/0.08)] ring-1 ring-gray-900/[0.06]';

// ── ToolbarButton ────────────────────────────────────────────────────────────

export interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly icon?: AppIcon;
  /** Filtre uygulanmış (dolu) görünüm. */
  readonly active?: boolean;
  /** Paneli açık olduğunda vurgulu çerçeve. */
  readonly open?: boolean;
  readonly count?: number;
  /** Sağdaki açılır ok gösterilsin mi? */
  readonly chevron?: boolean;
}

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ icon: Icon, active = false, open = false, count, chevron = true, className = '', children, ...props }, ref) => {
    const tone = active
      ? 'bg-gray-900 text-white shadow-[0_6px_16px_-6px_rgb(15_23_42/0.5)] hover:bg-gray-800'
      : open
        ? 'bg-white text-gray-900 ring-2 ring-inset ring-gray-900'
        : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-200 shadow-[0_1px_2px_rgb(15_23_42/0.05)] hover:bg-gray-50 hover:text-gray-900 hover:ring-gray-300';
    return (
      <button
        ref={ref}
        type="button"
        className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl pl-3.5 pr-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/25 active:scale-[0.98] ${tone} ${className}`}
        {...props}
      >
        {Icon && <Icon size={16} strokeWidth={2.25} className={active ? 'text-white/80' : 'text-gray-400'} aria-hidden="true" />}
        <span className="whitespace-nowrap">{children}</span>
        {typeof count === 'number' && count > 0 && (
          <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-primary-600 text-white'}`}>
            {count}
          </span>
        )}
        {chevron && (
          <ChevronDown
            size={15}
            strokeWidth={2.5}
            className={`transition-transform duration-200 ease-smooth ${open ? 'rotate-180' : ''} ${active ? 'text-white/70' : 'text-gray-400'}`}
            aria-hidden="true"
          />
        )}
      </button>
    );
  },
);
ToolbarButton.displayName = 'ToolbarButton';

// ── Popover ──────────────────────────────────────────────────────────────────

interface TriggerProps {
  readonly ref: React.RefObject<HTMLButtonElement | null>;
  readonly onClick: () => void;
  readonly open: boolean;
  readonly 'aria-expanded': boolean;
  readonly 'aria-controls': string;
  readonly 'aria-haspopup': 'dialog' | 'listbox' | 'menu';
}

interface PopoverProps {
  readonly trigger: (props: TriggerProps) => ReactNode;
  readonly children: (close: () => void) => ReactNode;
  readonly align?: 'start' | 'end';
  readonly widthClass?: string;
  readonly role?: 'dialog' | 'listbox' | 'menu';
  readonly label: string;
  readonly onOpenChange?: (open: boolean) => void;
}

export function Popover({ trigger, children, align = 'start', widthClass = 'w-80', role = 'dialog', label, onOpenChange }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const setOpenState = useCallback(
    (value: boolean) => {
      setOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange],
  );
  const close = useCallback(() => {
    setOpenState(false);
    triggerRef.current?.focus();
  }, [setOpenState]);
  const dismiss = useCallback(() => setOpenState(false), [setOpenState]);
  useClickOutside(containerRef, open, dismiss);

  // Escape'te kapat ve odağı tetikleyiciye geri ver (klavye kullanıcısı kaybolmaz).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => event.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <div ref={containerRef} className="relative">
      {trigger({
        ref: triggerRef,
        onClick: () => setOpenState(!open),
        open,
        'aria-expanded': open,
        'aria-controls': panelId,
        'aria-haspopup': role,
      })}
      {open && (
        <div
          id={panelId}
          role={role}
          aria-label={label}
          className={`absolute top-full z-50 mt-2 ${align === 'end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'} ${widthClass} ${POPOVER_PANEL}`}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

/** Panel başlığı: başlık, alt bilgi ve sağda isteğe bağlı aksiyon (ör. "Temizle"). */
export function PopoverHeader({ title, meta, action }: { title: string; meta?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-4">
      <div>
        <p className="text-sm font-bold text-gray-900">{title}</p>
        {meta && <p className="mt-0.5 text-xs text-gray-500">{meta}</p>}
      </div>
      {action}
    </div>
  );
}

// ── SelectMenu ───────────────────────────────────────────────────────────────

export interface SelectMenuOption {
  readonly value: string;
  readonly label: string;
}

interface SelectMenuProps {
  readonly label: string;
  readonly icon?: AppIcon;
  readonly options: readonly SelectMenuOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly align?: 'start' | 'end';
}

/** Tekli seçim menüsü. ↑/↓ ile gezilir, Enter/Space ile seçilir. */
export function SelectMenu({ label, icon, options, value, onChange, align = 'end' }: SelectMenuProps) {
  const current = options.find((option) => option.value === value) ?? options[0];
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'ArrowDown' ? Math.min(items.length - 1, index + 1) : Math.max(0, index - 1);
    items[next]?.focus();
  };

  return (
    <Popover
      label={label}
      role="listbox"
      align={align}
      widthClass="w-64"
      trigger={({ ref, open, ...aria }) => (
        <ToolbarButton ref={ref} icon={icon} open={open} {...aria}>
          <span className="text-gray-400">{label}:</span> {current.label}
        </ToolbarButton>
      )}
    >
      {(close) => (
        <div ref={listRef} onKeyDown={onKeyDown} className="p-1.5">
          {options.map((option) => {
            const selected = option.value === current.value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                autoFocus={selected}
                onClick={() => {
                  close();
                  if (!selected) onChange(option.value);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus-visible:bg-gray-100 ${
                  selected ? 'bg-primary-50 font-semibold text-primary-800' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.label}
                {selected && <Check size={16} strokeWidth={2.5} className="text-primary-600" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
}
