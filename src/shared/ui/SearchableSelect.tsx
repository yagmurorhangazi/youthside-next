/**
 * [MODÜL: ARANABİLİR SEÇİM ALANI — UI KIT GENİŞLETMESİ]
 * Amaç: Uzun lookup listelerini ve kısa form seçeneklerini tarayıcının yerel select/datalist
 * görünümüne bırakmadan, aynı modern ve erişilebilir açılır panel içinde sunmak.
 * Neden: Üniversite ve bölüm listeleri yüzlerce kayıt içerir; arama ve klavye gezinmesi olmadan
 * seçim yapmak zorlaşır. Gizli input yalnızca standart form gönderimini korur.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, type AppIcon } from './icons';

export interface SearchableSelectOption {
  readonly value: string;
  readonly label: string;
}

interface SearchableSelectProps
  extends Pick<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-describedby' | 'aria-invalid'> {
  readonly id: string;
  readonly name: string;
  readonly value: string;
  readonly options: readonly SearchableSelectOption[];
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly searchPlaceholder?: string;
  readonly emptyMessage?: string;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly searchable?: boolean;
  readonly clearable?: boolean;
  readonly icon?: AppIcon;
}

const fold = (value: string) =>
  value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

interface PanelPosition {
  readonly left: number;
  readonly width: number;
  readonly top?: number;
  readonly bottom?: number;
  readonly maxHeight: number;
}

/** Seçili kayıt listede yoksa eski profil değerini kaybetmeden göstermeye devam eder. */
export function SearchableSelect({
  id,
  name,
  value,
  options,
  onChange,
  placeholder = 'Seçiniz',
  searchPlaceholder = 'Ara…',
  emptyMessage = 'Sonuç bulunamadı.',
  loading = false,
  disabled = false,
  searchable = true,
  clearable = false,
  icon: Icon,
  ...a11y
}: SearchableSelectProps) {
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);

  const menuOptions = useMemo(
    () => (clearable && value ? [{ value: '', label: 'Seçimi temizle' }, ...options] : options),
    [clearable, options, value],
  );

  const filteredOptions = useMemo(() => {
    const needle = fold(query);
    if (!needle) return menuOptions;
    return menuOptions.filter((option) => fold(option.label).includes(needle));
  }, [menuOptions, query]);

  const selected = options.find((option) => option.value === value);
  const selectedLabel = selected?.label ?? value;

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    setQuery('');
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  /**
   * Panel body'ye taşındığı için konumu tetikleyicinin ekran koordinatından hesaplanır.
   * Sınırlar `visualViewport`'tan alınır: mobilde yakınlaştırma veya açık klavye varken
   * `innerWidth/innerHeight` görünmeyen alanı da kapsar ve panel ekran dışına açılırdı.
   */
  const measurePanel = useCallback((): PanelPosition | null => {
    const trigger = triggerRef.current;
    if (!trigger) return null;
    const rect = trigger.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewLeft = viewport?.offsetLeft ?? 0;
    const viewTop = viewport?.offsetTop ?? 0;
    const viewRight = viewLeft + (viewport?.width ?? window.innerWidth);
    const viewBottom = viewTop + (viewport?.height ?? window.innerHeight);
    const viewportMargin = 12;
    const panelGap = 8;
    const width = Math.min(rect.width, viewRight - viewLeft - viewportMargin * 2);
    const left = Math.min(Math.max(viewLeft + viewportMargin, rect.left), viewRight - width - viewportMargin);
    const spaceBelow = viewBottom - rect.bottom - panelGap - viewportMargin;
    const spaceAbove = rect.top - viewTop - panelGap - viewportMargin;
    const openAbove = spaceBelow < 280 && spaceAbove > spaceBelow;
    const availableHeight = Math.max(176, openAbove ? spaceAbove : spaceBelow);

    return openAbove
      ? { left, width, bottom: window.innerHeight - rect.top + panelGap, maxHeight: Math.min(400, availableHeight) }
      : { left, width, top: rect.bottom + panelGap, maxHeight: Math.min(400, availableHeight) };
  }, []);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    close();
  };

  const openMenu = () => {
    if (disabled || loading) return;
    const selectedIndex = menuOptions.findIndex((option) => option.value === value);
    setActiveIndex(Math.max(0, selectedIndex));
    setPanelPosition(measurePanel());
    setOpen(true);
  };

  // Portal paneli kaydırma, ekran boyutu ve mobil klavye/yakınlaştırma değişiminde tetikleyiciyi takip eder.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => setPanelPosition(measurePanel());
    const viewport = window.visualViewport;
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
    };
  }, [measurePanel, open]);

  // Panel root'un dışında (portal) olduğu için dış tıklama iki alanı birlikte kontrol eder.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) close(false);
    };
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [close, open]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      if (searchable) searchRef.current?.focus();
      else optionRefs.current[activeIndex]?.focus();
    });
  }, [open, searchable, activeIndex]);

  useEffect(() => {
    if (activeIndex >= filteredOptions.length) setActiveIndex(Math.max(0, filteredOptions.length - 1));
  }, [activeIndex, filteredOptions.length]);

  const move = (direction: 1 | -1) => {
    if (!filteredOptions.length) return;
    const nextIndex = (activeIndex + direction + filteredOptions.length) % filteredOptions.length;
    setActiveIndex(nextIndex);
    if (!searchable) requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
  };

  const onPanelKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (searchable && event.key === 'Enter' && filteredOptions[activeIndex]) {
      event.preventDefault();
      choose(filteredOptions[activeIndex].value);
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <input type="hidden" name={name} value={value} />
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled || loading}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) openMenu();
          }
        }}
        className={`group flex min-h-12 w-full items-center gap-3 rounded-2xl border bg-slate-50/50 px-4 py-3 text-left text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
          a11y['aria-invalid']
            ? 'border-red-300 ring-red-500/10'
            : open
              ? 'border-primary-400 bg-white shadow-card'
              : 'border-slate-200/60 text-slate-800 hover:border-slate-300 hover:bg-white'
        }`}
        {...a11y}
      >
        {Icon && (
          <Icon
            size={18}
            className={`shrink-0 transition-colors ${open ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-500'}`}
            aria-hidden="true"
          />
        )}
        <span className={`min-w-0 flex-1 truncate ${selectedLabel ? '' : 'font-medium text-slate-400'}`}>
          {loading ? 'Seçenekler yükleniyor…' : selectedLabel || placeholder}
        </span>
        {!loading && (
          <ChevronDown
            size={16}
            className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-primary-600' : ''}`}
            aria-hidden="true"
          />
        )}
      </button>

      {open && panelPosition && typeof document !== 'undefined' &&
        createPortal(
        <div
          ref={panelRef}
          className="animate-pop-in fixed z-9999 flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-hover ring-1 ring-slate-900/[0.07]"
          style={panelPosition}
        >
          {searchable && (
            <div className="border-b border-slate-100 p-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={onPanelKeyDown}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  aria-controls={listboxId}
                  aria-activedescendant={filteredOptions[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
                  autoComplete="off"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-500/10"
                />
              </div>
            </div>
          )}

          <div id={listboxId} role="listbox" aria-label={`${placeholder} seçenekleri`} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5" onKeyDown={onPanelKeyDown}>
            {filteredOptions.length ? (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <button
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    id={`${listboxId}-${index}`}
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={searchable ? -1 : isActive ? 0 : -1}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(option.value)}
                    className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors focus:outline-none ${
                      isSelected
                        ? 'bg-primary-50 font-semibold text-primary-800'
                        : isActive
                          ? 'bg-slate-100 font-medium text-slate-900'
                          : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{option.label}</span>
                    {isSelected && <Check size={17} className="shrink-0 text-primary-600" aria-hidden="true" />}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <Search size={22} className="mx-auto text-slate-300" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-slate-500">{emptyMessage}</p>
              </div>
            )}
          </div>

          {searchable && options.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] font-medium text-slate-500">
              {query ? `${filteredOptions.length} eşleşme` : `${options.length} seçenek`} · Ok tuşlarıyla gezinebilirsin
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
