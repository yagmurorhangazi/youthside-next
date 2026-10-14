/**
 * @file Yükleme sürerken sekme kapatılmak istenirse tarayıcının "Sayfadan ayrılmak istiyor musunuz?" uyarısı.
 * Kullanıcı yine de ayrılırsa yüklenen dosyalar sunucuda kayıtlıdır; dönüşte kaldığı yerden devam edilir.
 */

import { useEffect } from 'react';

export function useBeforeUnloadWarning(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Eski tarayıcılar için
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);
}
