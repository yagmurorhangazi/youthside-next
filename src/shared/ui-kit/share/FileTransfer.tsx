/**
 * @file Dosya/klasör transfer kartı (WeTransfer benzeri). Gösterim parçalarını birleştirir;
 * durum ve akış hook'lardadır: useFileSelection, useUpload, useCurrentUser, useResumableDrafts.
 * Ağ erişimi yoktur: istemciler ShareClientsProvider'dan gelir.
 */

import { RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ShareLink } from '../api/types';
import type { Connectivity } from '../api/retry';
import { Alert } from '../components/Alert';
import { useBeforeUnloadWarning } from '../hooks/useBeforeUnloadWarning';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useDropTarget } from '../hooks/useDropTarget';
import { useFileSelection } from '../hooks/useFileSelection';
import { useResumableDrafts } from '../hooks/useResumableDrafts';
import { useUpload } from '../hooks/useUpload';
import { Button } from '../primitives/Button';
import type { PickedFile } from '../utils/fileEntries';
import { formatBytes } from '../utils/formatBytes';
import { DropTile } from './DropTile';
import { FileDropCard } from './FileDropCard';
import { ResumeDraftBanner } from './ResumeDraftBanner';
import { SelectedFileList } from './SelectedFileList';
import { SenderEmailField } from './SenderEmailField';
import { ShareLinkResult } from './ShareLinkResult';
import { isUploadBusy } from './types';
import { UploadProgressPanel } from './UploadProgressPanel';

export interface FileTransferProps {
  readonly title?: string;
  /** Link oluşunca çağrılır. */
  readonly onComplete?: (link: ShareLink) => void;
  readonly concurrency?: number;
  /** Testler ve Storybook için. */
  readonly connectivity?: Connectivity;
  /** Kartı hazır seçimle açar (ör. sayfanın başka bir yerine bırakılan dosyalar). */
  readonly initialFiles?: readonly PickedFile[];
  readonly className?: string;
}

const MAX_LISTED_REJECTIONS = 4;

export function FileTransfer({ title, onComplete, concurrency, connectivity, initialFiles, className = 'max-w-md' }: FileTransferProps) {
  const hintId = useId();
  const user = useCurrentUser();
  const upload = useUpload({ concurrency, connectivity });
  const { phase, error, link } = upload.state;
  const busy = isUploadBusy(phase);
  const selection = useFileSelection({ locked: busy });
  const drafts = useResumableDrafts(user.status === 'ready');
  const [resumeDraftId, setResumeDraftId] = useState<number | null>(null);
  const [missingCount, setMissingCount] = useState(0);

  const { addPicked } = selection;
  const initialApplied = useRef(false);
  useEffect(() => {
    if (initialApplied.current || !initialFiles?.length) return;
    initialApplied.current = true;
    addPicked(initialFiles);
  }, [addPicked, initialFiles]);

  useBeforeUnloadWarning(busy);

  useEffect(() => {
    if (phase === 'success' && link) onComplete?.(link);
  }, [phase, link, onComplete]);

  const { addFromDataTransfer } = selection;
  const onDropFiles = useCallback((dataTransfer: DataTransfer) => void addFromDataTransfer(dataTransfer), [addFromDataTransfer]);
  const drop = useDropTarget(onDropFiles, busy || phase === 'success');

  const draft = drafts.drafts[0];
  const showDraft = draft !== undefined && !busy && phase !== 'success' && (selection.count === 0 || resumeDraftId === draft.id);
  const sessionLost = user.status !== 'ready' || error?.unauthorized === true;
  const canTransfer = !sessionLost && selection.count > 0 && !busy;
  const showProgress = phase !== 'idle' && phase !== 'cancelled';

  const transfer = async () => {
    if (!canTransfer) return;
    setMissingCount(0);
    if (resumeDraftId !== null) {
      const match = await upload.resume(resumeDraftId, selection.files);
      if (match && match.missing.length > 0) setMissingCount(match.missing.length);
      return;
    }
    await upload.start(selection.files);
  };

  const newTransfer = () => {
    upload.reset();
    selection.clear();
    setResumeDraftId(null);
    setMissingCount(0);
    drafts.refresh();
  };

  /** Kalıcı hatalı dosyaları seçimden çıkarıp yeni transfere hazırla (taslak silinir). */
  const restartWithoutFailed = () => {
    const failed = error?.failedIds ?? [];
    upload.cancel();
    upload.reset();
    setResumeDraftId(null);
    failed.forEach((id) => selection.remove(id));
  };

  const discardDraft = (id: number) => {
    if (resumeDraftId === id) setResumeDraftId(null);
    setMissingCount(0);
    void drafts.discard(id);
  };

  return (
    <FileDropCard isDragOver={drop.isDragOver} handlers={drop.handlers} className={className}>
      <div className="space-y-5 p-5 sm:p-6">
        {title && <h2 className="text-lg font-black text-slate-800">{title}</h2>}

        {phase === 'success' && link ? (
          <ShareLinkResult link={link} onNewTransfer={newTransfer} />
        ) : (
          <>
            {showDraft && (
              <ResumeDraftBanner
                draft={draft}
                active={resumeDraftId === draft.id}
                missingCount={missingCount}
                onResume={() => setResumeDraftId(draft.id)}
                onDiscard={() => discardDraft(draft.id)}
              />
            )}

            {selection.count === 0 ? (
              <div>
                <div className="flex gap-3">
                  <DropTile variant="file" onFiles={selection.addFromInput} disabled={busy} />
                  <DropTile variant="folder" onFiles={selection.addFromInput} disabled={busy} />
                </div>
                <p id={hintId} className="mt-3 text-center text-xs font-medium text-slate-400">
                  ya da dosyaları ve klasörleri bu karta sürükleyip bırakın
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-500" aria-live="polite">
                    {selection.count} dosya · {formatBytes(selection.totalSize)}
                  </p>
                  {!busy && phase !== 'error' && (
                    <div className="flex items-center">
                      <DropTile variant="file" compact onFiles={selection.addFromInput} />
                      <DropTile variant="folder" compact onFiles={selection.addFromInput} />
                    </div>
                  )}
                </div>
                <SelectedFileList
                  files={selection.files}
                  progress={showProgress ? upload.state.files : undefined}
                  locked={selection.locked}
                  onRemove={selection.remove}
                />
              </div>
            )}

            {selection.rejected.length > 0 && !busy && (
              <div role="alert">
                <Alert variant="warning" title={`${selection.rejected.length} dosya eklenmedi`}>
                  <ul className="space-y-0.5">
                    {selection.rejected.slice(0, MAX_LISTED_REJECTIONS).map((r) => (
                      <li key={`${r.relativePath}-${r.reason}`} className="break-words">
                        <span className="font-bold">{r.relativePath}</span>: {r.message}
                      </li>
                    ))}
                    {selection.rejected.length > MAX_LISTED_REJECTIONS && (
                      <li>ve {selection.rejected.length - MAX_LISTED_REJECTIONS} dosya daha.</li>
                    )}
                  </ul>
                  <button type="button" onClick={selection.dismissRejected} className="mt-2 text-xs font-bold underline">
                    Kapat
                  </button>
                </Alert>
              </div>
            )}

            <SenderEmailField status={user.status} email={user.user?.email} errorMessage={user.errorMessage} />

            {busy && <UploadProgressPanel state={upload.state} onCancel={upload.cancel} />}

            {phase === 'error' && error && (
              <div role="alert" className="space-y-3">
                <Alert variant="error" title="Transfer tamamlanamadı">
                  {error.message}
                  {error.canRetry && ' Yüklenen dosyalar korunuyor; tekrar denediğinizde kaldığı yerden devam edilir.'}
                </Alert>
                {error.canRetry && (
                  <Button className="w-full" icon={RotateCcw} onClick={() => void upload.retry()}>
                    Kaldığı yerden tekrar dene
                  </Button>
                )}
                {!error.canRetry && !error.unauthorized && (error.failedIds?.length ?? 0) > 0 && (
                  <Button className="w-full" variant="outline" onClick={restartWithoutFailed}>
                    Hatalı dosyaları çıkar ve yeniden başla
                  </Button>
                )}
                {!error.canRetry && (error.failedIds?.length ?? 0) === 0 && (
                  <Button className="w-full" variant="outline" onClick={upload.reset}>
                    Seçime geri dön
                  </Button>
                )}
              </div>
            )}

            {phase === 'cancelled' && (
              <p role="status" className="text-center text-xs font-bold text-slate-400">
                Transfer iptal edildi. Dosyalarınız seçili duruyor.
              </p>
            )}

            {!busy && phase !== 'error' && (
              <Button className="w-full" size="lg" onClick={() => void transfer()} disabled={!canTransfer} aria-describedby={selection.count === 0 ? hintId : undefined}>
                {resumeDraftId !== null ? 'Kalanları yükle' : 'Transfer'}
              </Button>
            )}
          </>
        )}
      </div>
    </FileDropCard>
  );
}
