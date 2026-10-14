/**
 * @file Bir alanı sürükle-bırak hedefi yapar. Alt öğelere girip çıkarken titremeyi önlemek için
 * enter/leave sayılır. Yalnızca dosya sürüklendiğinde tepki verir.
 */

import { useCallback, useRef, useState, type DragEvent } from 'react';

export interface DropTargetHandlers {
  onDragEnter(event: DragEvent): void;
  onDragOver(event: DragEvent): void;
  onDragLeave(event: DragEvent): void;
  onDrop(event: DragEvent): void;
}

export function useDropTarget(onDropFiles: (dataTransfer: DataTransfer) => void, disabled = false): {
  readonly isDragOver: boolean;
  readonly handlers: DropTargetHandlers;
} {
  const [isDragOver, setIsDragOver] = useState(false);
  const depth = useRef(0);

  const carriesFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files');

  const onDragEnter = useCallback(
    (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth.current++;
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const onDragOver = useCallback(
    (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      // preventDefault olmadan tarayıcı drop olayını vermez (dosyayı sekmede açar)
      event.preventDefault();
      event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
    },
    [disabled],
  );

  const onDragLeave = useCallback((event: DragEvent) => {
    if (!carriesFiles(event)) return;
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setIsDragOver(false);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth.current = 0;
      setIsDragOver(false);
      if (!disabled) onDropFiles(event.dataTransfer);
    },
    [disabled, onDropFiles],
  );

  return { isDragOver, handlers: { onDragEnter, onDragOver, onDragLeave, onDrop } };
}
