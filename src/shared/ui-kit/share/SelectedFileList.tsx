/**
 * @file Eklenen dosyaların listesi: ad, boyut, dosya bazında durum (bekliyor / %42 / tamamlandı / hata) ve kaldırma.
 * Çok sayıda dosyada liste sanallaştırılır: yalnızca görünen satırlar çizilir.
 */

import { useVirtualizer } from '@tanstack/react-virtual';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useRef, type CSSProperties } from 'react';
import { ProgressMeter } from '../components/ProgressMeter';
import { formatBytes, formatPercent } from '../utils/formatBytes';
import { FileTypeIcon, splitPath } from './fileIcon';
import type { FileUploadState, SelectedFile } from './types';

export interface SelectedFileListProps {
  readonly files: readonly SelectedFile[];
  /** Yükleme başladıysa dosya bazında durum (useUpload'dan hazır gelir). */
  readonly progress?: Readonly<Record<string, FileUploadState>>;
  /** Yükleme sürerken kaldırma devre dışı. */
  readonly locked?: boolean;
  readonly onRemove?: (id: string) => void;
  readonly className?: string;
}

const ROW_HEIGHT = 60;
const VIRTUALIZE_AFTER = 60;
const MAX_VISIBLE_ROWS = 5;

export function SelectedFileList({ files, progress, locked = false, onRemove, className = '' }: SelectedFileListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtual = files.length > VIRTUALIZE_AFTER;
  // TanStack Virtual, React Compiler'ın otomatik memo'lamasıyla uyumsuz; bu bileşen derleyiciden muaf kalır (bilinen durum)
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    enabled: virtual,
  });

  const renderRow = (file: SelectedFile, index: number, style?: CSSProperties) => (
    <FileRow
      key={file.id}
      file={file}
      state={progress?.[file.id]}
      locked={locked}
      onRemove={onRemove}
      position={index + 1}
      total={files.length}
      style={style}
    />
  );

  return (
    <div
      ref={scrollRef}
      className={`overflow-y-auto overscroll-contain ${className}`}
      style={{ maxHeight: ROW_HEIGHT * MAX_VISIBLE_ROWS + 8 }}
    >
      <ul aria-label="Eklenen dosyalar" className="relative" style={virtual ? { height: virtualizer.getTotalSize() } : undefined}>
        {virtual
          ? virtualizer.getVirtualItems().map((row) => {
              const file = files[row.index];
              return file ? renderRow(file, row.index, { position: 'absolute', left: 0, right: 0, top: row.start }) : null;
            })
          : files.map((file, index) => renderRow(file, index))}
      </ul>
    </div>
  );
}

interface FileRowProps {
  readonly file: SelectedFile;
  readonly state: FileUploadState | undefined;
  readonly locked: boolean;
  readonly onRemove: ((id: string) => void) | undefined;
  readonly position: number;
  readonly total: number;
  readonly style?: CSSProperties;
}

function FileRow({ file, state, locked, onRemove, position, total, style }: FileRowProps) {
  const { name, folder } = splitPath(file.relativePath);

  return (
    <li
      aria-posinset={position}
      aria-setsize={total}
      style={style}
      className="flex h-[60px] items-center gap-3 border-b border-slate-50 px-1 last:border-b-0"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400" aria-hidden="true">
        <FileTypeIcon mimeType={file.mimeType} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-700" title={file.relativePath}>
          {name}
        </p>
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
          <span className="shrink-0">{formatBytes(file.size)}</span>
          {folder && <span className="truncate">· {folder}</span>}
          {state && <StatusLabel state={state} />}
        </div>
        {state?.status === 'uploading' && (
          <ProgressMeter size="sm" value={state.percent} label={`${name} yükleniyor`} className="mt-1" />
        )}
      </div>
      {onRemove && !state && (
        <button
          type="button"
          onClick={() => onRemove(file.id)}
          disabled={locked}
          aria-label={`${file.relativePath} dosyasını kaldır`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

function StatusLabel({ state }: { readonly state: FileUploadState }) {
  switch (state.status) {
    case 'queued':
      return <span className="ml-auto shrink-0 text-slate-400">Bekliyor</span>;
    case 'uploading':
      return <span className="ml-auto shrink-0 font-bold tabular-nums text-primary-700">{formatPercent(state.percent)}</span>;
    case 'done':
      return (
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-bold text-emerald-600">
          <CheckCircle2 size={12} aria-hidden="true" /> Tamamlandı
        </span>
      );
    case 'error':
      return (
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-bold text-red-600" title={state.errorMessage}>
          <AlertCircle size={12} aria-hidden="true" /> Hata
        </span>
      );
  }
}
