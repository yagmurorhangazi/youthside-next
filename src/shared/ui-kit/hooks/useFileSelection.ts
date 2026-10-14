/**
 * @file Seçilen dosyaların durumu: ekle, kaldır, temizle; kurallara uymayanlar ayrı listelenir.
 * Dosya okuma (input/sürükle-bırak) utils/fileEntries.ts'te, kurallar utils/uploadRules.ts'tedir.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ShareLimits } from '../api/types';
import type { RejectedFile, SelectedFile } from '../share/types';
import { filesFromDataTransfer, filesFromInput, type PickedFile } from '../utils/fileEntries';
import { getRejectionMessage } from '../utils/shareErrors';
import { DEFAULT_SHARE_LIMITS, resolveMimeType, validateFile, type FileRejectionReason } from '../utils/uploadRules';

export interface SelectionResult {
  readonly files: readonly SelectedFile[];
  readonly rejected: readonly RejectedFile[];
}

/**
 * Yeni seçilen dosyaları mevcut seçime ekler. Saf fonksiyon: aynı girdi aynı çıktı (birim testi buna yapılır).
 * Sıra: tür/boyut → boş dosya → aynı yol → adet → toplam boyut.
 */
export function mergeSelection(current: readonly SelectedFile[], picked: readonly PickedFile[], limits: ShareLimits): SelectionResult {
  const files = [...current];
  const rejected: RejectedFile[] = [];
  const paths = new Set(current.map((f) => f.relativePath));
  let total = current.reduce((sum, f) => sum + f.size, 0);

  const reject = (relativePath: string, reason: FileRejectionReason) =>
    rejected.push({ relativePath, reason, message: getRejectionMessage(reason, limits) });

  for (const { file, relativePath } of picked) {
    const invalid = validateFile(file, limits);
    if (invalid) reject(relativePath, invalid);
    else if (file.size === 0) reject(relativePath, 'empty');
    else if (paths.has(relativePath)) reject(relativePath, 'duplicate');
    else if (files.length >= limits.maxFiles) reject(relativePath, 'count');
    else if (total + file.size > limits.maxTotalBytes) reject(relativePath, 'total');
    else {
      paths.add(relativePath);
      total += file.size;
      files.push({ id: relativePath, file, relativePath, size: file.size, mimeType: resolveMimeType(file), lastModified: file.lastModified });
    }
  }
  return { files, rejected };
}

export interface UseFileSelectionOptions {
  readonly limits?: ShareLimits;
  /** Yükleme sürerken ekleme ve kaldırma devre dışı. */
  readonly locked?: boolean;
}

export interface UseFileSelectionResult {
  readonly files: readonly SelectedFile[];
  readonly rejected: readonly RejectedFile[];
  readonly totalSize: number;
  readonly count: number;
  readonly locked: boolean;
  addPicked(picked: readonly PickedFile[]): void;
  addFromInput(files: FileList | readonly File[] | null): void;
  addFromDataTransfer(dataTransfer: DataTransfer): Promise<void>;
  remove(id: string): void;
  clear(): void;
  dismissRejected(): void;
}

export function useFileSelection({ limits = DEFAULT_SHARE_LIMITS, locked = false }: UseFileSelectionOptions = {}): UseFileSelectionResult {
  const [state, setState] = useState<SelectionResult>({ files: [], rejected: [] });

  const addPicked = useCallback(
    (picked: readonly PickedFile[]) => {
      if (locked || picked.length === 0) return;
      // Her ekleme yeni reddedilenleri gösterir; önceki uyarılar temizlenir
      setState((prev) => mergeSelection(prev.files, picked, limits));
    },
    [limits, locked],
  );

  const addFromInput = useCallback((files: FileList | readonly File[] | null) => addPicked(filesFromInput(files)), [addPicked]);

  const addFromDataTransfer = useCallback(
    async (dataTransfer: DataTransfer) => {
      if (locked) return;
      addPicked(await filesFromDataTransfer(dataTransfer));
    },
    [addPicked, locked],
  );

  const remove = useCallback(
    (id: string) => {
      if (locked) return;
      setState((prev) => ({ ...prev, files: prev.files.filter((f) => f.id !== id) }));
    },
    [locked],
  );

  const clear = useCallback(() => setState({ files: [], rejected: [] }), []);
  const dismissRejected = useCallback(() => setState((prev) => ({ ...prev, rejected: [] })), []);

  const totalSize = useMemo(() => state.files.reduce((sum, f) => sum + f.size, 0), [state.files]);

  return {
    files: state.files,
    rejected: state.rejected,
    totalSize,
    count: state.files.length,
    locked,
    addPicked,
    addFromInput,
    addFromDataTransfer,
    remove,
    clear,
    dismissRejected,
  };
}
