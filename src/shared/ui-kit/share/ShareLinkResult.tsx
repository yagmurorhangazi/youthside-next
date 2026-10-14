/**
 * @file Transfer bitince oluşan herkese açık link, kopyala düğmesi ve "Yeni transfer".
 */

import { Check, CheckCircle2, Copy } from 'lucide-react';
import { useId } from 'react';
import type { ShareLink } from '../api/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { Button } from '../primitives/Button';
import { formatBytes } from '../utils/formatBytes';

export interface ShareLinkResultProps {
  readonly link: ShareLink;
  readonly onNewTransfer: () => void;
  readonly className?: string;
}

export function ShareLinkResult({ link, onNewTransfer, className = '' }: ShareLinkResultProps) {
  const { copied, copy } = useCopyToClipboard();
  const inputId = useId();

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600" aria-hidden="true">
        <CheckCircle2 size={28} />
      </span>
      <h2 className="text-lg font-black text-slate-800">Transferiniz hazır</h2>
      <p className="mt-1 text-sm font-medium text-slate-400">
        {link.fileCount} dosya · {formatBytes(link.totalSize)}
      </p>

      <div className="mt-6 w-full space-y-1.5 text-left">
        <label htmlFor={inputId} className="ml-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Paylaşım linki
        </label>
        <div className="flex items-center gap-2">
          <input
            id={inputId}
            readOnly
            value={link.publicUrl}
            onFocus={(event) => event.currentTarget.select()}
            className="min-w-0 flex-1 rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-700 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/5"
          />
          <Button variant={copied ? 'secondary' : 'primary'} icon={copied ? Check : Copy} onClick={() => void copy(link.publicUrl)}>
            {copied ? 'Kopyalandı' : 'Kopyala'}
          </Button>
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {copied ? 'Link panoya kopyalandı.' : ''}
        </p>
      </div>

      <Button variant="outline" className="mt-6 w-full" onClick={onNewTransfer}>
        Yeni transfer
      </Button>
    </div>
  );
}
