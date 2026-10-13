import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const overlayStack: symbol[] = [];
let scrollLocks = 0;
let originalOverflow = '';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function lockScroll() {
  if (scrollLocks === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLocks += 1;
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.style.overflow = originalOverflow;
}

interface OverlayDialogOptions {
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape: boolean;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/** Shared keyboard, focus and scroll behavior for Modal and Sheet. */
export function useOverlayDialog({
  isOpen,
  onClose,
  closeOnEscape,
  containerRef,
  initialFocusRef,
}: OverlayDialogOptions) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    const token = Symbol('overlay');
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    overlayStack.push(token);
    lockScroll();

    const frame = window.requestAnimationFrame(() => {
      const target = initialFocusRef?.current
        ?? containerRef.current?.querySelector<HTMLElement>(FOCUSABLE)
        ?? containerRef.current;
      target?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (overlayStack.at(-1) !== token) return;

      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !containerRef.current) return;
      const focusable = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);

      if (focusable.length === 0) {
        event.preventDefault();
        containerRef.current.focus();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      const index = overlayStack.indexOf(token);
      if (index !== -1) overlayStack.splice(index, 1);
      unlockScroll();
      previouslyFocused?.focus();
    };
  }, [closeOnEscape, containerRef, initialFocusRef, isOpen]);
}
