/**
 * @file Linki açan kişinin gördüğü sayfa içeriği. Giriş gerektirmez; salt okunur.
 * Route tanımı host projededir (ör. `/s/:token` → <SharedContentView shareToken={token} />).
 */

import { Clock, Download, SearchX } from 'lucide-react';
import { Alert } from '../components/Alert';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../data-display/EmptyState';
import { usePublicShare } from '../hooks/usePublicShare';
import { Button } from '../primitives/Button';
import { Card } from '../primitives/Card';
import { formatBytes } from '../utils/formatBytes';
import type { PublicShare } from '../api/types';
import { FileTypeIcon, splitPath } from './fileIcon';
import { SharedFileTree } from './SharedFileTree';

export interface SharedContentViewProps {
  readonly shareToken: string;
  readonly className?: string;
}

const dateFormat = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' });

function summary(share: PublicShare): string {
  const parts = [`${share.fileCount} dosya`, formatBytes(share.totalSize)];
  if (share.createdAt) parts.push(dateFormat.format(new Date(share.createdAt)));
  return parts.join(' · ');
}

export function SharedContentView({ shareToken, className = 'max-w-xl' }: SharedContentViewProps) {
  const { status, share, errorMessage, reload } = usePublicShare(shareToken);

  return (
    <Card className={`w-full ${className}`}>
      <div className="p-5 sm:p-6" aria-busy={status === 'loading'}>
        {status === 'loading' && (
          <div className="space-y-4" aria-label="Paylaşım yükleniyor">
            <Skeleton height={24} width="60%" />
            <Skeleton height={14} width="40%" />
            <div className="space-y-2 pt-2">
              <Skeleton height={48} rounded="xl" />
              <Skeleton height={48} rounded="xl" />
              <Skeleton height={48} rounded="xl" />
            </div>
          </div>
        )}

        {status === 'notFound' && (
          <EmptyState
            compact
            icon={SearchX}
            title="Paylaşım bulunamadı"
            description="Link hatalı olabilir ya da paylaşım kaldırılmış olabilir. Linki gönderen kişiyle iletişime geçin."
          />
        )}

        {status === 'expired' && (
          <EmptyState compact icon={Clock} title="Bu paylaşımın süresi dolmuş" description="Dosyalara artık bu link üzerinden ulaşılamıyor." />
        )}

        {status === 'error' && (
          <div role="alert" className="space-y-3">
            <Alert variant="error" title="Paylaşım yüklenemedi">
              {errorMessage}
            </Alert>
            <Button variant="outline" className="w-full" onClick={reload}>
              Tekrar dene
            </Button>
          </div>
        )}

        {status === 'ready' && share && (
          <>
            <header className="mb-5">
              <h1 className="text-lg font-black text-slate-800">Paylaşılan dosyalar</h1>
              <p className="mt-1 text-sm font-medium text-slate-400">{summary(share)}</p>
            </header>
            {share.files.length === 1 && share.files[0] && !share.files[0].relativePath.includes('/') ? (
              <SingleFile share={share} />
            ) : (
              <SharedFileTree files={share.files} />
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function SingleFile({ share }: { readonly share: PublicShare }) {
  const file = share.files[0];
  if (!file) return null;
  const { name } = splitPath(file.relativePath);

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-slate-50/60 p-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary-600 shadow-sm" aria-hidden="true">
        <FileTypeIcon mimeType={file.mimeType} size={26} />
      </span>
      <div className="min-w-0 max-w-full">
        <p className="break-words text-base font-bold text-slate-800">{name}</p>
        <p className="mt-1 text-sm font-medium text-slate-400">{formatBytes(file.size)}</p>
      </div>
      <a
        href={file.downloadUrl}
        download={name}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary-700 px-6 text-sm font-bold tracking-wide text-white shadow-lg shadow-primary-700/10 transition-all hover:bg-primary-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/30"
      >
        <Download size={18} className="mr-2.5" strokeWidth={2.5} aria-hidden="true" />
        İndir
      </a>
    </div>
  );
}
