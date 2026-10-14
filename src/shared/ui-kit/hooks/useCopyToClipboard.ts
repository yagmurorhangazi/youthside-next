/**
 * @file Panoya kopyalama. Clipboard API yoksa (http, eski tarayıcı) gizli bir textarea ile kopyalanır.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export function useCopyToClipboard(resetAfterMs = 2000): { readonly copied: boolean; copy(text: string): Promise<boolean> } {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = useCallback(
    async (text: string) => {
      let ok: boolean;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        ok = legacyCopy(text);
      }
      setCopied(ok);
      if (timer.current) clearTimeout(timer.current);
      if (ok) timer.current = setTimeout(() => setCopied(false), resetAfterMs);
      return ok;
    },
    [resetAfterMs],
  );

  return { copied, copy };
}

function legacyCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}
