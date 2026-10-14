/**
 * @file "Dosya ekle" ve "Klasör ekle" kutucuklarının ortak tabanı. İki varyant yalnızca yapılandırmayla ayrılır.
 * Tıklayınca (ya da Enter/Space) seçim penceresi açılır; klasör varyantında `webkitdirectory` ile alt klasörler dahil seçilir.
 */

import { FolderPlus, Plus, type LucideIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';

export type DropTileVariant = 'file' | 'folder';

interface VariantConfig {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly hint: string;
  readonly directory: boolean;
}

const VARIANTS: Record<DropTileVariant, VariantConfig> = {
  file: { icon: Plus, title: 'Dosya ekle', hint: 'Bir ya da birden çok dosya', directory: false },
  folder: { icon: FolderPlus, title: 'Klasör ekle', hint: 'Alt klasörleriyle birlikte', directory: true },
};

export interface DropTileProps {
  readonly variant: DropTileVariant;
  readonly onFiles: (files: FileList | null) => void;
  readonly disabled?: boolean;
  /** Dosya eklendikten sonra küçük düğme görünümü. */
  readonly compact?: boolean;
  readonly className?: string;
}

export function DropTile({ variant, onFiles, disabled = false, compact = false, className = '' }: DropTileProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { icon: Icon, title, hint, directory } = VARIANTS[variant];

  // React `webkitdirectory` özniteliğini tanımaz; DOM özelliği doğrudan atanır
  useEffect(() => {
    if (inputRef.current) inputRef.current.webkitdirectory = directory;
  }, [directory]);

  const open = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        aria-disabled={disabled || undefined}
        className={
          compact
            ? `inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-primary-700 transition-colors hover:bg-primary-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${className}`
            : `group flex min-h-[132px] flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 text-center transition-all hover:border-primary-400 hover:bg-primary-50/40 focus:outline-none focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-slate-50/50 ${className}`
        }
      >
        {compact ? (
          <Icon size={14} strokeWidth={2.5} aria-hidden="true" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-700 text-white shadow-lg shadow-primary-700/20 transition-transform group-hover:scale-105">
            <Icon size={20} strokeWidth={2.5} aria-hidden="true" />
          </span>
        )}
        <span className={compact ? '' : 'flex flex-col gap-0.5'}>
          <span className={compact ? '' : 'text-sm font-bold text-slate-800'}>{title}</span>
          {!compact && <span className="text-xs font-medium text-slate-400">{hint}</span>}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onChange={(event) => {
          onFiles(event.target.files);
          // Aynı dosya tekrar seçilebilsin
          event.target.value = '';
        }}
      />
    </>
  );
}
