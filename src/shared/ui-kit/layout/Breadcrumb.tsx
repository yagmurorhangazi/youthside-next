/**
 * @file Header'ın solundaki konum göstergesi (breadcrumb).
 * Author: Ferhat Cengiz
 *
 * Router'dan bağımsızdır: kırıntı listesi dışarıdan verilir ya da
 * `breadcrumbsFromPath` ile URL'den üretilir. Uzun yollarda (slug'lar) orta
 * segmentler "…" altında toplanır ki header taşmasın.
 */

import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

export interface BreadcrumbProps {
  readonly items: readonly BreadcrumbItem[];
  /** Son olmayan kırıntıya tıklanınca çağrılır (SPA gezinmesi). Yoksa `href` düz bağlantı olur. */
  readonly onNavigate?: (item: BreadcrumbItem) => void;
  /** Tek (ya da hiç) kırıntı varken ev ikonu ile gösterilecek metin. */
  readonly homeLabel?: string;
  /** `chevron` (admin) veya `slash` (çağrı merkezi/cash). */
  readonly separator?: 'chevron' | 'slash';
  /** Bu sayıdan fazla kırıntı varsa ortası katlanır. */
  readonly collapseAfter?: number;
  readonly className?: string;
}

type DisplayItem =
  | { readonly kind: 'crumb'; readonly item: BreadcrumbItem; readonly isLast: boolean; readonly index: number }
  | { readonly kind: 'ellipsis'; readonly hiddenLabels: readonly string[] };

/**
 * URL yolundan kırıntı listesi üretir. `labels` segment → görünen ad eşlemesidir;
 * eşlemede olmayan segment olduğu gibi gösterilir.
 */
export function breadcrumbsFromPath(pathname: string, labels: Readonly<Record<string, string>> = {}): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((segment, index) => ({
    href: `/${segments.slice(0, index + 1).join('/')}`,
    label: labels[segment] ?? decodeURIComponent(segment),
  }));
}

export function Breadcrumb({
  items,
  onNavigate,
  homeLabel = 'Dashboard',
  separator = 'chevron',
  collapseAfter = 3,
  className = '',
}: BreadcrumbProps) {
  if (items.length <= 1) {
    return (
      <div className={`flex min-w-0 items-center gap-2 ${className}`}>
        <Home size={16} className="shrink-0 text-slate-400" />
        <span className="truncate text-sm font-bold text-slate-700">{items[0]?.label ?? homeLabel}</span>
      </div>
    );
  }

  const crumbs: DisplayItem[] = items.map((item, index) => ({
    kind: 'crumb',
    item,
    index,
    isLast: index === items.length - 1,
  }));

  const display: DisplayItem[] =
    crumbs.length > collapseAfter
      ? [
          crumbs[0]!,
          crumbs[1]!,
          { kind: 'ellipsis', hiddenLabels: items.slice(2, -1).map((c) => c.label) },
          crumbs[crumbs.length - 1]!,
        ]
      : crumbs;

  return (
    <nav aria-label="Breadcrumb" className={`flex min-w-0 items-center gap-1.5 overflow-hidden text-sm ${className}`}>
      {display.map((entry, position) => (
        <div
          key={entry.kind === 'ellipsis' ? 'ellipsis' : `${entry.index}-${entry.item.label}`}
          className="flex shrink-0 items-center gap-1.5 last:min-w-0 last:shrink"
        >
          {position > 0 &&
            (separator === 'chevron' ? (
              <ChevronRight size={14} className="shrink-0 text-slate-300" />
            ) : (
              <span className="text-slate-300">/</span>
            ))}

          {entry.kind === 'ellipsis' ? (
            <span className="px-0.5 font-bold text-slate-400" title={entry.hiddenLabels.join(' / ')}>
              …
            </span>
          ) : entry.isLast ? (
            <span aria-current="page" className="max-w-[140px] truncate font-bold text-slate-800 sm:max-w-[260px]">
              {entry.item.label}
            </span>
          ) : onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate(entry.item)}
              className="max-w-[120px] truncate font-medium text-slate-400 transition-colors hover:text-primary-600 sm:max-w-[200px]"
            >
              {entry.item.label}
            </button>
          ) : entry.item.href ? (
            <a
              href={entry.item.href}
              className="max-w-[120px] truncate font-medium text-slate-400 transition-colors hover:text-primary-600 sm:max-w-[200px]"
            >
              {entry.item.label}
            </a>
          ) : (
            <span className="max-w-[120px] truncate font-bold text-slate-400 sm:max-w-[200px]">{entry.item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
