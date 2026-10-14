/**
 * @file Kartın tamamı sürükle-bırak alanıdır. Dosya sürüklenirken kart vurgulanır ve "Bırakın" katmanı görünür.
 * Sürükleme durumu useDropTarget'tan gelir; bu bileşen yalnızca gösterir.
 */

import { UploadCloud } from 'lucide-react';
import type { ReactNode } from 'react';
import type { DropTargetHandlers } from '../hooks/useDropTarget';

export interface FileDropCardProps {
  readonly isDragOver: boolean;
  readonly handlers?: DropTargetHandlers;
  readonly children: ReactNode;
  readonly className?: string;
}

export function FileDropCard({ isDragOver, handlers, children, className = '' }: FileDropCardProps) {
  return (
    <section
      {...handlers}
      aria-label="Dosya transferi"
      className={`relative w-full rounded-[24px] border bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors ${
        isDragOver ? 'border-primary-400 ring-4 ring-primary-500/10' : 'border-slate-100'
      } ${className}`}
    >
      {children}
      {isDragOver && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2 z-10 flex flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-primary-500 bg-primary-50/95"
        >
          <UploadCloud size={40} className="text-primary-600" />
          <p className="text-base font-black text-primary-800">Bırakın, ekleyelim</p>
          <p className="text-xs font-medium text-primary-700/80">Dosyalar ve klasörler</p>
        </div>
      )}
    </section>
  );
}
