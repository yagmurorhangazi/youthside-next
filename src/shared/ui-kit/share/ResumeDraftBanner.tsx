/**
 * @file Yarım kalan transfer kartı. Tarayıcı kapanan sayfanın dosyalarına erişemediği için kullanıcıdan
 * aynı dosya/klasörü yeniden bırakması istenir; yalnızca eksikler yüklenir.
 */

import { History } from 'lucide-react';
import type { DraftSummary } from '../api/types';
import { Button } from '../primitives/Button';
import { formatByteProgress } from '../utils/formatBytes';

export interface ResumeDraftBannerProps {
  readonly draft: DraftSummary;
  /** Devam modu açık: kullanıcı dosyaları yeniden seçiyor. */
  readonly active: boolean;
  /** Son denemede seçimde bulunamayan dosya sayısı. */
  readonly missingCount?: number;
  readonly onResume: () => void;
  readonly onDiscard: () => void;
  readonly className?: string;
}

export function ResumeDraftBanner({ draft, active, missingCount = 0, onResume, onDiscard, className = '' }: ResumeDraftBannerProps) {
  const remaining = draft.fileCount - draft.uploadedCount;

  return (
    <div role="region" aria-label="Yarım kalan transfer" className={`rounded-2xl border border-amber-100 bg-amber-50 p-4 ${className}`}>
      <div className="flex gap-3">
        <History size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-bold text-amber-900">Yarım kalan bir transferiniz var</p>
          <p className="mt-0.5 font-medium text-amber-800/90">
            {draft.uploadedCount}/{draft.fileCount} dosya yüklendi ({formatByteProgress(draft.uploadedSize, draft.totalSize)}).
            {active
              ? ' Aynı dosyaları ya da klasörü yeniden ekleyin; yalnızca kalan dosyalar yüklenecek.'
              : ` Kalan ${remaining} dosyayı yükleyip linki oluşturabilirsiniz.`}
          </p>
          {missingCount > 0 && (
            <p role="alert" className="mt-2 font-bold text-red-700">
              {missingCount} dosya seçimde bulunamadı. Transferdeki dosyaların aynısını (aynı ad ve klasörle) ekleyin.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {!active && (
              <Button size="sm" onClick={onResume}>
                Kaldığım yerden devam et
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onDiscard}>
              Vazgeç
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
