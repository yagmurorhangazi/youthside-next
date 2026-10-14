/**
 * @file Yükleme akışı ve durumu. İlerleme hesabı (yüzde, yüklenen/toplam bayt, dosya bazında durum)
 * yalnızca burada yapılır; bileşenler hazır değeri alıp gösterir.
 *
 * Akış: taslak aç → dosyaları CDN'e yükle (biten dosya toplu olarak sunucuya kaydedilir)
 *       → "Link oluşturuluyor" → link.
 * Bağlantı koparsa beklenir ve otomatik devam edilir. Sayfa kapanırsa taslak sunucuda kalır;
 * `resume` ile yalnızca eksik dosyalar yüklenir.
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createRegistrationBatcher, type RegistrationBatcher } from '../api/registrationBatcher';
import type { Connectivity } from '../api/retry';
import { useShareApiClient } from '../api/ShareClientsProvider';
import { ApiError, isAbortError, isRetryableError, isUnauthorizedError } from '../api/errors';
import type { ManifestEntry } from '../api/types';
import type { UploadFileInput } from '../api/uploadQueue';
import type { FileUploadState, SelectedFile, UploadErrorState, UploadState } from '../share/types';
import { matchFilesToManifest, type ResumeMatch } from '../utils/resumeMatch';
import { getShareErrorMessage } from '../utils/shareErrors';
import { computeUploadProgress, filePercent } from '../utils/uploadProgress';

export interface UseUploadOptions {
  readonly concurrency?: number;
  /** Testler ve Storybook için. Varsayılan: tarayıcının online/offline olayları. */
  readonly connectivity?: Connectivity;
  readonly registerBatchSize?: number;
  readonly registerIntervalMs?: number;
}

export interface UseUploadResult {
  readonly state: UploadState;
  /** Yeni transfer başlatır. */
  start(files: readonly SelectedFile[]): Promise<void>;
  /**
   * Yarım kalan taslağa devam eder. Seçimde eksik dosya varsa yüklemeye başlamaz;
   * eşleme sonucunu döndürür ki arayüz hangi dosyaların gerektiğini söyleyebilsin.
   * Taslak alınamazsa durum 'error' olur ve null döner.
   */
  resume(shareId: number, files: readonly SelectedFile[]): Promise<ResumeMatch<SelectedFile> | null>;
  /** Hata sonrası aynı transferi kaldığı yerden yeniden dener. */
  retry(): Promise<void>;
  /** Yüklemeyi gerçekten durdurur (AbortSignal) ve taslağı siler. */
  cancel(): void;
  /** "Yeni transfer": ekranı sıfırlar. */
  reset(): void;
}

export const INITIAL_UPLOAD_STATE: UploadState = {
  phase: 'idle',
  percent: 0,
  uploadedBytes: 0,
  totalBytes: 0,
  files: {},
  shareId: null,
  link: null,
  error: null,
};

type Action =
  | { type: 'reset' }
  | { type: 'preparing'; entries: ReadonlyArray<{ id: string; size: number; done: boolean }> }
  | { type: 'started'; shareId: number }
  | { type: 'progress'; loaded: ReadonlyMap<string, number> }
  | { type: 'fileStatus'; id: string; status: FileUploadState['status']; errorMessage?: string }
  | { type: 'network'; waiting: boolean }
  | { type: 'finalizing' }
  | { type: 'success'; link: NonNullable<UploadState['link']> }
  | { type: 'error'; error: UploadErrorState }
  | { type: 'cancelled' };

/** Dosya durumlarından genel ilerlemeyi yeniden hesaplar (tek hesap yeri: utils/uploadProgress). */
function withProgress(state: UploadState, files: Record<string, FileUploadState>): UploadState {
  const items = Object.values(files);
  const summary = computeUploadProgress(items, state, items.length > 0 && items.every((f) => f.status === 'done'));
  return { ...state, files, ...summary };
}

export function uploadReducer(state: UploadState, action: Action): UploadState {
  switch (action.type) {
    case 'reset':
      return INITIAL_UPLOAD_STATE;
    case 'preparing': {
      const files: Record<string, FileUploadState> = {};
      for (const { id, size, done } of action.entries) {
        files[id] = { id, size, loaded: done ? size : 0, percent: done ? 100 : 0, status: done ? 'done' : 'queued' };
      }
      return withProgress({ ...INITIAL_UPLOAD_STATE, phase: 'preparing' }, files);
    }
    case 'started':
      return { ...state, phase: 'uploading', shareId: action.shareId };
    case 'progress': {
      const files = { ...state.files };
      for (const [id, loaded] of action.loaded) {
        const file = files[id];
        if (!file || file.status === 'done') continue;
        files[id] = { ...file, loaded, percent: filePercent(loaded, file.size) };
      }
      return withProgress(state, files);
    }
    case 'fileStatus': {
      const file = state.files[action.id];
      if (!file) return state;
      const done = action.status === 'done';
      const next: FileUploadState = {
        ...file,
        status: action.status,
        loaded: done ? file.size : action.status === 'error' ? 0 : file.loaded,
        percent: done ? 100 : action.status === 'error' ? 0 : file.percent,
        errorMessage: action.errorMessage,
      };
      return withProgress(state, { ...state.files, [action.id]: next });
    }
    case 'network':
      if (state.phase !== 'uploading' && state.phase !== 'waitingForNetwork') return state;
      return { ...state, phase: action.waiting ? 'waitingForNetwork' : 'uploading' };
    case 'finalizing':
      return { ...state, phase: 'finalizing' };
    case 'success':
      return { ...state, phase: 'success', link: action.link, percent: 100, uploadedBytes: state.totalBytes, error: null };
    case 'error':
      return { ...state, phase: 'error', error: action.error };
    case 'cancelled':
      return { ...state, phase: 'cancelled', error: null };
  }
}

function toErrorState(error: unknown, canRetry: boolean): UploadErrorState {
  const unauthorized = isUnauthorizedError(error);
  return {
    message: getShareErrorMessage(error),
    code: error instanceof ApiError ? error.code : undefined,
    unauthorized,
    canRetry: canRetry && !unauthorized,
  };
}

function toManifest(files: readonly SelectedFile[]): ManifestEntry[] {
  return files.map((f) => ({ relativePath: f.relativePath, size: f.size, lastModified: f.lastModified }));
}

function toInput(file: SelectedFile): UploadFileInput {
  return { id: file.id, file: file.file, relativePath: file.relativePath, size: file.size, mimeType: file.mimeType };
}

/** İlerleme olaylarını kare başına bire indirir: binlerce dosyada render yükü oluşmaz. */
function scheduleFrame(callback: () => void): () => void {
  if (typeof requestAnimationFrame === 'function') {
    const id = requestAnimationFrame(callback);
    return () => cancelAnimationFrame(id);
  }
  const id = setTimeout(callback, 16);
  return () => clearTimeout(id);
}

interface ActiveRun {
  controller: AbortController;
  batcher: RegistrationBatcher | null;
  shareId: number | null;
  files: readonly SelectedFile[];
}

export function useUpload(options: UseUploadOptions = {}): UseUploadResult {
  const api = useShareApiClient();
  const [state, dispatch] = useReducer(uploadReducer, INITIAL_UPLOAD_STATE);
  const run = useRef<ActiveRun | null>(null);
  const pendingProgress = useRef(new Map<string, number>());
  const cancelFrame = useRef<(() => void) | null>(null);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const flushProgress = useCallback(() => {
    cancelFrame.current?.();
    cancelFrame.current = null;
    if (pendingProgress.current.size === 0) return;
    const loaded = new Map(pendingProgress.current);
    pendingProgress.current.clear();
    dispatch({ type: 'progress', loaded });
  }, []);

  const queueProgress = useCallback(
    (id: string, loaded: number) => {
      pendingProgress.current.set(id, loaded);
      cancelFrame.current ??= scheduleFrame(flushProgress);
    },
    [flushProgress],
  );

  // Bileşen kaldırılırsa (sayfadan çıkış) yükleme durur ama taslak silinmez: dönüşte devam edilebilir
  useEffect(
    () => () => {
      run.current?.controller.abort();
      run.current?.batcher?.dispose();
      cancelFrame.current?.();
    },
    [],
  );

  /** Ortak akış: yeni transfer ya da var olan taslağa devam. */
  const execute = useCallback(
    async (files: readonly SelectedFile[], existing?: { shareId: number; directory: string; doneIds: ReadonlySet<string> }) => {
      run.current?.controller.abort();
      const controller = new AbortController();
      const { signal } = controller;
      const current: ActiveRun = { controller, batcher: null, shareId: existing?.shareId ?? null, files };
      run.current = current;
      const { concurrency, connectivity, registerBatchSize, registerIntervalMs } = optionsRef.current;

      try {
        let directory = existing?.directory;
        if (!existing) {
          const draft = await api.prepareShare(toManifest(files), { signal });
          current.shareId = draft.id;
          directory = draft.uploadDirectory;
        }
        const shareId = current.shareId as number;
        dispatch({ type: 'started', shareId });

        const batcher = createRegistrationBatcher((records) => api.registerFiles(shareId, records, { signal }), {
          signal,
          connectivity,
          maxBatch: registerBatchSize,
          intervalMs: registerIntervalMs,
        });
        current.batcher = batcher;

        const pending = files.filter((f) => !existing?.doneIds.has(f.id));
        const result = await api.uploadFiles(directory as string, pending.map(toInput), {
          signal,
          concurrency,
          connectivity,
          onProgress: (report) => queueProgress(report.file.id, report.file.loaded),
          onFileStart: (id) => dispatch({ type: 'fileStatus', id, status: 'uploading' }),
          onFileUploaded: (id, record) => {
            pendingProgress.current.delete(id);
            dispatch({ type: 'fileStatus', id, status: 'done' });
            batcher.add(record);
          },
          onFileError: (id, error) => {
            pendingProgress.current.delete(id);
            dispatch({ type: 'fileStatus', id, status: 'error', errorMessage: getShareErrorMessage(error) });
          },
          onNetworkStateChange: (waiting) => dispatch({ type: 'network', waiting }),
        });
        flushProgress();

        if (result.failed.length > 0) {
          await batcher.flush();
          // Geçici hata (ağ) varsa aynı taslak yeniden denenebilir; yalnızca kalıcı hata (ör. tür reddi) varsa
          // o dosyalar kaldırılıp yeni transfer başlatılmalıdır
          const canRetry = result.failed.some((f) => isRetryableError(f.error));
          const message =
            result.failed.length === 1
              ? `1 dosya yüklenemedi: ${getShareErrorMessage(result.failed[0]?.error)}`
              : `${result.failed.length} dosya yüklenemedi.`;
          dispatch({ type: 'error', error: { ...toErrorState(result.failed[0]?.error, canRetry), message, failedIds: result.failed.map((f) => f.id) } });
          return;
        }

        // Bütün baytlar gönderildi: %100'de donmuş görünmesin diye ayrı ara durum
        dispatch({ type: 'finalizing' });
        await batcher.flush();
        const link = await api.createShare({ shareId }, { signal });
        dispatch({ type: 'success', link });
      } catch (error) {
        if (isAbortError(error) || signal.aborted) return;
        flushProgress();
        dispatch({ type: 'error', error: toErrorState(error, current.shareId !== null) });
      }
    },
    [api, flushProgress, queueProgress],
  );

  const start = useCallback(
    async (files: readonly SelectedFile[]) => {
      dispatch({ type: 'preparing', entries: files.map((f) => ({ id: f.id, size: f.size, done: false })) });
      await execute(files);
    },
    [execute],
  );

  const resume = useCallback(
    async (shareId: number, files: readonly SelectedFile[]) => {
      let snapshot;
      try {
        snapshot = await api.getShareProgress(shareId);
      } catch (error) {
        dispatch({ type: 'error', error: toErrorState(error, false) });
        return null;
      }
      const match = matchFilesToManifest(files, snapshot.files);
      if (match.missing.length > 0) return match;

      // Zaten yüklenmiş dosyalar ilerlemeye "tamamlandı" olarak sayılır
      const doneIds = new Set(match.alreadyUploaded.map((f) => f.relativePath));
      dispatch({
        type: 'preparing',
        entries: [
          ...match.alreadyUploaded.map((f) => ({ id: f.relativePath, size: f.size, done: true })),
          ...match.toUpload.map((f) => ({ id: f.id, size: f.size, done: false })),
        ],
      });
      await execute(match.toUpload, { shareId, directory: snapshot.uploadDirectory, doneIds });
      return match;
    },
    [api, execute],
  );

  const retry = useCallback(async () => {
    const previous = run.current;
    if (!previous || previous.shareId === null) return;
    await resume(previous.shareId, previous.files);
  }, [resume]);

  const cancel = useCallback(() => {
    const current = run.current;
    if (!current) return;
    current.controller.abort();
    current.batcher?.dispose();
    flushProgress();
    dispatch({ type: 'cancelled' });
    // Kullanıcı açıkça iptal etti: taslak silinir (en iyi çaba; başarısız olursa yarım transfer listesinde görünür)
    if (current.shareId !== null) api.deleteShare(current.shareId).catch(() => undefined);
    run.current = null;
  }, [api, flushProgress]);

  const reset = useCallback(() => {
    run.current?.controller.abort();
    run.current?.batcher?.dispose();
    run.current = null;
    pendingProgress.current.clear();
    cancelFrame.current?.();
    cancelFrame.current = null;
    dispatch({ type: 'reset' });
  }, []);

  return { state, start, resume, retry, cancel, reset };
}
