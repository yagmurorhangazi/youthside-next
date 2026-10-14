/**
 * @file Liste sayfalarının genel amaçlı veri tablosu.
 * Author: Ferhat Cengiz
 *
 * Arama, sıralama, satır tıklama, iskelet yükleme, boş durum, mobil kart görünümü
 * ve sayfalamayı tek yerde toplar. Veri kaynağını bilmez: kolon tanımları ve
 * satırlar dışarıdan verilir (generic <T>).
 *
 * Sıralama iki modda çalışır:
 *   - Server-side: `sortState` + `onSortChange` verilir, tablo yalnız ikonu çizer.
 *   - Lokal: `onSortChange` yoksa, `sortValue` tanımlı kolonlarda veri tablo içinde sıralanır.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { Pagination } from '../components/Pagination';

export type SortDirection = 'asc' | 'desc';

export interface DataTableColumn<T> {
  readonly key: string;
  readonly header: ReactNode;
  readonly render: (row: T) => ReactNode;
  readonly sortable?: boolean;
  /** Lokal sıralamada karşılaştırılacak değer. */
  readonly sortValue?: (row: T) => string | number | null | undefined;
  /** Başlık hücresine eklenecek Tailwind sınıfı (ör. genişlik). */
  readonly width?: string;
  readonly align?: 'left' | 'center' | 'right';
}

export interface DataTablePagination {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly onPageChange: (page: number) => void;
  readonly totalItems?: number;
  readonly perPage?: number;
  readonly onPageSizeChange?: (perPage: number) => void;
  readonly pageSizeOptions?: number[];
}

export interface DataTableProps<T> {
  readonly data: readonly T[];
  readonly columns: readonly DataTableColumn<T>[];
  readonly getRowId: (row: T) => string;
  /** Arama kutusu gösterilsin mi? Varsayılan: `onSearch` verildiyse. */
  readonly searchable?: boolean;
  readonly searchPlaceholder?: string;
  /** Kontrollü arama değeri (URL'den gelen sorgu gibi). */
  readonly searchValue?: string;
  readonly onSearch?: (query: string) => void;
  readonly onRowClick?: (row: T) => void;
  /**
   * Mobilde (md altı) tablo yerine kart listesi. Verilmezse mobilde de tablo
   * yatay kaydırma ile gösterilir.
   */
  readonly renderMobileCard?: (row: T) => ReactNode;
  readonly headerActions?: ReactNode;
  readonly isLoading?: boolean;
  readonly skeletonRowCount?: number;
  /** Boş durumda gösterilecek içerik (metin ya da `EmptyState`). */
  readonly emptyState?: ReactNode;
  readonly pagination?: DataTablePagination;
  readonly sortState?: { readonly key: string; readonly dir: SortDirection };
  readonly onSortChange?: (key: string, dir: SortDirection) => void;
  readonly className?: string;
}

const ALIGN_CLASS = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'tr', { numeric: true, sensitivity: 'base' });
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  searchable,
  searchPlaceholder = 'Ara...',
  searchValue,
  onSearch,
  onRowClick,
  renderMobileCard,
  headerActions,
  isLoading = false,
  skeletonRowCount = 5,
  emptyState = 'Gösterilecek veri bulunamadı.',
  pagination,
  sortState,
  onSortChange,
  className = '',
}: DataTableProps<T>) {
  const [internalQuery, setInternalQuery] = useState('');
  const [localSort, setLocalSort] = useState<{ key: string; dir: SortDirection } | null>(null);

  const query = searchValue ?? internalQuery;
  const showSearch = searchable ?? Boolean(onSearch);
  const activeSort = sortState ?? localSort;

  const handleSearch = (value: string) => {
    if (searchValue === undefined) setInternalQuery(value);
    onSearch?.(value);
  };

  const handleSort = (key: string) => {
    const dir: SortDirection = activeSort?.key === key && activeSort.dir === 'asc' ? 'desc' : 'asc';
    if (onSortChange) onSortChange(key, dir);
    else setLocalSort({ key, dir });
  };

  const rows = useMemo(() => {
    if (onSortChange || !localSort) return data;
    const column = columns.find((c) => c.key === localSort.key);
    if (!column?.sortValue) return data;
    const factor = localSort.dir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => factor * compareValues(column.sortValue!(a), column.sortValue!(b)));
  }, [data, columns, localSort, onSortChange]);

  const skeletonRows = Array.from({ length: skeletonRowCount }, (_, i) => i);
  const emptyContent =
    typeof emptyState === 'string' ? <p className="text-sm font-medium text-slate-400">{emptyState}</p> : emptyState;

  const sortIcon = (key: string) => {
    if (activeSort?.key !== key) return <ArrowUpDown size={14} className="text-slate-300" />;
    return activeSort.dir === 'asc' ? (
      <ArrowUp size={14} className="text-primary-500" />
    ) : (
      <ArrowDown size={14} className="text-primary-500" />
    );
  };

  return (
    <div className={`overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${className}`}>
      {(showSearch || headerActions) && (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
          {showSearch ? (
            <div className="relative w-full sm:min-w-[280px] sm:max-w-2xl sm:flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="search"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(event) => handleSearch(event.target.value)}
                className="w-full rounded-xl border border-slate-200/60 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-medium transition-all placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/10"
              />
            </div>
          ) : (
            <div />
          )}
          {headerActions && <div className="flex shrink-0 flex-wrap items-center gap-2">{headerActions}</div>}
        </div>
      )}

      {renderMobileCard && (
        <div className="md:hidden">
          {isLoading ? (
            <div className="divide-y divide-slate-50">
              {skeletonRows.map((i) => (
                <div key={`m-skeleton-${i}`} className="p-4">
                  <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-16 text-center">{emptyContent}</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {rows.map((row) => (
                <div
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`p-4 transition-colors ${onRowClick ? 'cursor-pointer active:bg-slate-50' : ''}`}
                >
                  {renderMobileCard(row)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={`overflow-x-auto ${renderMobileCard ? 'hidden md:block' : ''}`}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={
                    activeSort?.key === col.key ? (activeSort.dir === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                  className={`px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 ${ALIGN_CLASS[col.align ?? 'left']} ${col.width ?? ''}`}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex cursor-pointer items-center gap-1.5 uppercase transition-colors hover:text-slate-600"
                    >
                      {col.header}
                      {sortIcon(col.key)}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              skeletonRows.map((i) => (
                <tr key={`skeleton-${i}`} className="border-b border-slate-50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4">
                      <div className="h-4 w-3/4 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  {emptyContent}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-slate-50 transition-colors hover:bg-slate-50/50 ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-6 py-4 text-sm text-slate-700 ${ALIGN_CLASS[col.align ?? 'left']}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
          totalItems={pagination.totalItems}
          perPage={pagination.perPage}
          onPageSizeChange={pagination.onPageSizeChange}
          pageSizeOptions={pagination.pageSizeOptions}
        />
      )}
    </div>
  );
}
