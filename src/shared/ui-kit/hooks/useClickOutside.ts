/**
 * @file Dropdown/popover dışına tıklanınca veya Escape'e basılınca kapatma davranışı.
 * Author: Ferhat Cengiz
 */

import { useEffect, type RefObject } from 'react';

/**
 * `active` true iken `ref` dışına yapılan tıklamada ve Escape tuşunda `onOutside` çağrılır.
 * Kapalıyken dinleyici bağlanmaz.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onOutside: () => void,
): void {
  useEffect(() => {
    if (!active) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOutside();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, active, onOutside]);
}
