/**
 * [MODÜL: FİLTRE ÇUBUĞU — REACT ISLAND]
 * Amaç: Liste sayfalarında (ilanlar, etkinlikler, şirketler, kulüpler) arama, çoklu seçim
 *       filtresi, sıralama ve aktif filtre çiplerini tek bileşende sunmak.
 *
 * Mimari:
 *   - Generic'tir: hangi filtrelerin olduğunu bilmez, `groups` verisiyle çizer (OCP).
 *   - Durum URL'de tutulur; "Uygula" tıklanınca yeni URL'e gidilir ve sayfa sunucuda
 *     yeniden render edilir (SEO dostu, geri tuşu çalışır, sonuç paylaşılabilir).
 *   - Masaüstü: her grup için açılır menü. Mobil: tüm filtreler alttan açılan panelde.
 */

import { useEffect, useMemo, useRef, useState, type SubmitEvent } from 'react';
import { ArrowUpDown, Briefcase, Check, Globe, History, House, ListFilter, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { buildHref, type ParamState } from '@/shared/lib/search-params';
import { Popover, PopoverHeader, SelectMenu, ToolbarButton } from '@/shared/ui';

/**
 * Filtre ikonları isimle verilir: Astro → React island sınırında bileşen (fonksiyon)
 * serileştirilemediği için sayfa yalnızca adı gönderir, eşleme burada yapılır.
 */
const GROUP_ICONS = { briefcase: Briefcase, house: House, 'map-pin': MapPin, globe: Globe } satisfies Record<string, LucideIcon>;
export type FilterIconName = keyof typeof GROUP_ICONS;

export interface FilterGroup {
  /** URL parametre adı (ör. "sehir"). */
  readonly key: string;
  readonly label: string;
  readonly options: readonly string[];
  readonly icon?: FilterIconName;
}

export interface SortOption {
  readonly value: string;
  readonly label: string;
}

export interface FilterBarProps {
  readonly basePath: string;
  readonly searchPlaceholder: string;
  readonly groups: readonly FilterGroup[];
  readonly sorts?: readonly SortOption[];
  /** Ek açık/kapalı filtre (ör. "Geçmiş etkinlikleri de göster"). */
  readonly toggle?: { readonly key: string; readonly label: string };
  readonly initial: {
    readonly q?: string;
    readonly values: Readonly<Record<string, readonly string[]>>;
    readonly sort?: string;
    readonly toggle?: boolean;
  };
  readonly total: number;
  readonly resultNoun: string;
}

type Values = Record<string, string[]>;

const SEARCH_KEY = 'q';
const SORT_KEY = 'sirala';

function toState(q: string, values: Values, sort: string | undefined, toggle: FilterBarProps['toggle'], toggleOn: boolean): ParamState {
  return {
    [SEARCH_KEY]: q.trim() || undefined,
    ...values,
    [SORT_KEY]: sort || undefined,
    ...(toggle ? { [toggle.key]: toggleOn ? '1' : undefined } : {}),
  };
}

/** Seçenek listesi; uzunsa içinde arama kutusu gösterir. Masaüstü panel ve mobil sayfa ortak kullanır. */
function OptionList({
  group,
  selected,
  onToggle,
}: {
  group: FilterGroup;
  selected: readonly string[];
  onToggle: (value: string) => void;
}) {
  const [term, setTerm] = useState('');
  const visible = useMemo(
    () => group.options.filter((option) => option.toLocaleLowerCase('tr-TR').includes(term.toLocaleLowerCase('tr-TR'))),
    [group.options, term],
  );

  return (
    <div>
      {group.options.length > 8 && (
        <div className="relative px-3 pb-2">
          <Search size={15} className="pointer-events-none absolute left-6 top-1/2 -translate-y-[calc(50%+4px)] text-gray-400" aria-hidden="true" />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={`${group.label} ara…`}
            aria-label={`${group.label} içinde ara`}
            autoFocus
            className="h-10 w-full rounded-xl bg-gray-50 pl-9 pr-3 text-sm ring-1 ring-inset ring-gray-200 transition placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
      )}
      <ul className="max-h-72 overflow-y-auto overscroll-contain px-1.5 pb-1.5">
        {visible.length === 0 && <li className="px-3 py-6 text-center text-sm text-gray-400">“{term}” için sonuç yok</li>}
        {visible.map((option) => {
          const checked = selected.includes(option);
          return (
            <li key={option}>
              <label
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
                  checked ? 'bg-primary-50/70 font-semibold text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <input type="checkbox" checked={checked} onChange={() => onToggle(option)} className="peer sr-only" />
                <span
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] transition-[background-color,box-shadow] duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 ${
                    checked ? 'bg-primary-600 text-white shadow-[0_2px_6px_-1px_rgb(240_76_17/0.5)]' : 'bg-white ring-1 ring-inset ring-gray-300'
                  }`}
                  aria-hidden="true"
                >
                  {checked && <Check size={13} strokeWidth={3.5} />}
                </span>
                <span className="truncate">{option}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Masaüstü filtre: araç çubuğu butonu + panel. Seçimler "Uygula" ile URL'e yansır. */
function FilterDropdown({ group, applied, onApply }: { group: FilterGroup; applied: readonly string[]; onApply: (values: string[]) => void }) {
  const [draft, setDraft] = useState<string[]>([...applied]);
  const toggleValue = (value: string) =>
    setDraft((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));

  return (
    <Popover
      label={`${group.label} filtresi`}
      onOpenChange={(open) => open && setDraft([...applied])}
      trigger={({ ref, open, ...aria }) => (
        <ToolbarButton ref={ref} icon={group.icon ? GROUP_ICONS[group.icon] : undefined} open={open} active={applied.length > 0} count={applied.length} {...aria}>
          {applied.length === 1 ? applied[0] : group.label}
        </ToolbarButton>
      )}
    >
      {(close) => (
        <>
          <PopoverHeader
            title={group.label}
            meta={`${group.options.length} seçenek`}
            action={
              draft.length > 0 && (
                <button type="button" onClick={() => setDraft([])} className="rounded-lg px-2 py-1 text-xs font-bold text-gray-500 transition hover:bg-gray-100 hover:text-gray-900">
                  Temizle
                </button>
              )
            }
          />
          <OptionList group={group} selected={draft} onToggle={toggleValue} />
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/70 px-4 py-3">
            <span className="text-xs font-medium text-gray-500">{draft.length > 0 ? `${draft.length} seçili` : 'Tümü'}</span>
            <button
              type="button"
              onClick={() => {
                close();
                onApply(draft);
              }}
              className="h-9 rounded-full bg-gray-900 px-5 text-sm font-bold text-white shadow-[0_6px_16px_-6px_rgb(15_23_42/0.5)] transition hover:bg-gray-800 active:scale-[0.98]"
            >
              Uygula
            </button>
          </div>
        </>
      )}
    </Popover>
  );
}

export default function FilterBar({ basePath, searchPlaceholder, groups, sorts = [], toggle, initial, total, resultNoun }: FilterBarProps) {
  const [q, setQ] = useState(initial.q ?? '');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Values>({});
  const [isNavigating, setIsNavigating] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetCloseRef = useRef<HTMLButtonElement>(null);

  const applied: Values = useMemo(
    () => Object.fromEntries(groups.map((group) => [group.key, [...(initial.values[group.key] ?? [])]])),
    [groups, initial.values],
  );
  const activeCount = Object.values(applied).reduce((sum, list) => sum + list.length, 0) + (initial.toggle ? 1 : 0);

  const go = (state: ParamState) => {
    setIsNavigating(true);
    window.location.assign(buildHref(basePath, state));
  };
  const navigate = (overrides: { q?: string; values?: Values; sort?: string; toggle?: boolean } = {}) =>
    go(toState(overrides.q ?? q, overrides.values ?? applied, overrides.sort ?? initial.sort, toggle, overrides.toggle ?? Boolean(initial.toggle)));

  // Mobil panel açıkken arka plan kaymasın.
  useEffect(() => {
    if (!sheetOpen) return;
    setDraft(applied);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = requestAnimationFrame(() => sheetCloseRef.current?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSheetOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
      filterTriggerRef.current?.focus();
    };
  }, [sheetOpen, applied]);

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate();
  };

  const chips = groups.flatMap((group) => applied[group.key].map((value) => ({ key: group.key, value })));

  return (
    <div className={isNavigating ? 'pointer-events-none opacity-70 transition-opacity' : ''} aria-busy={isNavigating}>
      {/* Arama */}
      <form onSubmit={onSubmit} role="search" className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift transition focus-within:border-primary-300 focus-within:ring-4 focus-within:ring-primary-500/10 sm:rounded-full">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={searchPlaceholder}
            enterKeyHint="search"
            className="h-12 w-full rounded-xl bg-transparent pl-11 pr-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none sm:rounded-full"
          />
        </label>
        <button type="submit" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary-700 px-5 text-sm font-semibold text-white shadow-lg shadow-primary-700/15 transition hover:bg-primary-800 sm:rounded-full sm:px-8">
          <Search size={16} aria-hidden="true" />
          Ara
        </button>
      </form>

      {/* Sonuç özeti + filtreler + sıralama aynı araç satırında tutulur. */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-sm backdrop-blur-sm">
        <div className="mr-1 flex min-h-10 items-center gap-2 rounded-xl bg-slate-50/80 px-3 text-sm text-slate-600" aria-live="polite">
          <ListFilter size={16} className="text-primary-600" aria-hidden="true" />
          <p>
            <strong className="font-bold text-slate-950">{total.toLocaleString('tr-TR')}</strong> {resultNoun} bulundu
            {initial.q && (
              <>
                {' '}
                · “<span className="font-semibold text-slate-900">{initial.q}</span>”
              </>
            )}
          </p>
        </div>

        {groups.length > 0 && (
          <ToolbarButton
            ref={filterTriggerRef}
            icon={SlidersHorizontal}
            onClick={() => setSheetOpen(true)}
            active={activeCount > 0}
            count={activeCount}
            chevron={false}
            className="md:hidden"
          >
            Filtreler
          </ToolbarButton>
        )}

        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {groups.map((group) => (
            <FilterDropdown
              key={group.key}
              group={group}
              applied={applied[group.key]}
              onApply={(values) => navigate({ values: { ...applied, [group.key]: values } })}
            />
          ))}
          {toggle && (
            <ToolbarButton
              role="switch"
              aria-checked={Boolean(initial.toggle)}
              icon={History}
              active={Boolean(initial.toggle)}
              chevron={false}
              onClick={() => navigate({ toggle: !initial.toggle })}
            >
              {toggle.label}
            </ToolbarButton>
          )}
        </div>

        {sorts.length > 0 && (
          <div className="ml-auto">
            <SelectMenu
              label="Sırala"
              icon={ArrowUpDown}
              options={sorts}
              value={initial.sort ?? sorts[0].value}
              onChange={(value) => navigate({ sort: value === sorts[0].value ? undefined : value })}
            />
          </div>
        )}
      </div>

      {/* Aktif filtre çipleri yalnızca gerçekten seçim olduğunda ek satır açar. */}
      {(chips.length > 0 || initial.q || initial.toggle) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {chips.map((chip) => (
            <button
              key={`${chip.key}:${chip.value}`}
              type="button"
              onClick={() => navigate({ values: { ...applied, [chip.key]: applied[chip.key].filter((item) => item !== chip.value) } })}
              className="flex min-h-9 items-center gap-1 rounded-full border border-primary-100 bg-primary-50 pl-3 pr-2 text-xs font-bold text-primary-700 transition hover:border-primary-200 hover:bg-primary-100"
              aria-label={`${chip.value} filtresini kaldır`}
            >
              {chip.value}
              <X size={14} aria-hidden="true" />
            </button>
          ))}
          <a href={basePath} className="text-xs font-bold text-primary-600 underline-offset-2 hover:underline">
            Tümünü temizle
          </a>
        </div>
      )}

      {/* Mobil filtre paneli */}
      {sheetOpen && (
        <div className="fixed inset-0 z-70 md:hidden" role="dialog" aria-modal="true" aria-label="Filtreler">
          <div className="animate-backdrop-in absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSheetOpen(false)} aria-hidden="true" />
          <div ref={sheetRef} className="animate-sheet-up absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-bold text-gray-900">Filtreler</h2>
              <button ref={sheetCloseRef} type="button" onClick={() => setSheetOpen(false)} aria-label="Filtreleri kapat" className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100">
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
              {groups.map((group) => (
                <fieldset key={group.key}>
                  <legend className="mb-2 px-3 text-sm font-bold text-gray-900">{group.label}</legend>
                  <OptionList
                    group={group}
                    selected={draft[group.key] ?? []}
                    onToggle={(value) =>
                      setDraft((current) => {
                        const list = current[group.key] ?? [];
                        return { ...current, [group.key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] };
                      })
                    }
                  />
                </fieldset>
              ))}
              {toggle && (
                <label className="mx-3 flex min-h-12 items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 text-sm font-semibold text-gray-800">
                  {toggle.label}
                  <input
                    type="checkbox"
                    defaultChecked={Boolean(initial.toggle)}
                    onChange={(event) => setDraft((current) => ({ ...current, __toggle: event.target.checked ? ['1'] : [] }))}
                    className="h-5 w-5 accent-primary-600"
                  />
                </label>
              )}
            </div>
            <div className="flex gap-2 border-t border-gray-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setDraft(Object.fromEntries(groups.map((group) => [group.key, []])))}
                className="h-12 flex-1 rounded-xl border border-gray-200 text-sm font-bold text-gray-700"
              >
                Temizle
              </button>
              <button
                type="button"
                onClick={() => {
                  const { __toggle, ...values } = draft;
                  navigate({ values, toggle: __toggle ? __toggle.length > 0 : Boolean(initial.toggle) });
                }}
                className="h-12 flex-[2] rounded-xl bg-primary-600 text-sm font-bold text-white"
              >
                Sonuçları göster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
