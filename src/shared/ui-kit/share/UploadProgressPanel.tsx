/**
 * @file Genel yükleme ilerlemesi: yüzde, çubuk, "12,4 MB / 30 MB", evre metni ve İptal.
 * Bütün değerler useUpload'dan hazır gelir; burada hesap yapılmaz.
 */

import { Loader2, WifiOff } from 'lucide-react';
import { Button } from '../primitives/Button';
import { ProgressMeter } from '../components/ProgressMeter';
import { formatByteProgress, formatPercent } from '../utils/formatBytes';
import type { UploadState } from './types';

export interface UploadProgressPanelProps {
  readonly state: UploadState;
  readonly onCancel: () => void;
  readonly className?: string;
}

/** Ekran okuyucuya evre değişimini duyuran metin (yüzde her değiştiğinde okunmaz). */
function phaseText(state: UploadState): string {
  switch (state.phase) {
    case 'preparing':
      return 'Transfer hazırlanıyor…';
    case 'uploading':
      return 'Yükleniyor…';
    case 'waitingForNetwork':
      return 'Bağlantı bekleniyor. Bağlantı gelince kaldığı yerden devam edecek.';
    case 'finalizing':
      return 'Link oluşturuluyor…';
    default:
      return '';
  }
}

export function UploadProgressPanel({ state, onCancel, className = '' }: UploadProgressPanelProps) {
  const finalizing = state.phase === 'finalizing';
  const waiting = state.phase === 'waitingForNetwork';
  const preparing = state.phase === 'preparing';
  const files = Object.values(state.files);
  const doneCount = files.filter((f) => f.status === 'done').length;
  const bytes = formatByteProgress(state.uploadedBytes, state.totalBytes);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[40px] font-black leading-none tracking-tight text-slate-800 tabular-nums" aria-hidden="true">
            {finalizing ? '%100' : formatPercent(state.percent)}
          </p>
          <p className="mt-2 text-xs font-bold text-slate-400 tabular-nums">{bytes}</p>
        </div>
        <p className="shrink-0 pb-0.5 text-xs font-bold text-slate-400 tabular-nums">
          {doneCount}/{files.length} dosya
        </p>
      </div>

      <ProgressMeter
        value={finalizing ? 100 : state.percent}
        indeterminate={finalizing || preparing}
        label="Yükleme ilerlemesi"
        valueText={finalizing ? 'Link oluşturuluyor' : `${formatPercent(state.percent)}, ${bytes}`}
      />

      <div className="flex min-h-[44px] items-center justify-between gap-3">
        <p
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2 text-sm font-bold ${waiting ? 'text-amber-700' : 'text-slate-600'}`}
        >
          {waiting && <WifiOff size={16} aria-hidden="true" />}
          {(finalizing || preparing) && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {phaseText(state)}
        </p>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          İptal
        </Button>
      </div>
    </div>
  );
}
