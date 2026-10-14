/**
 * [MODÜL: GERİ SAYIM HOOK'U]
 * Amaç: Saniye bazlı geri sayım; süre bitince `onDone` bir kez çağrılır.
 *
 * Neden ayrı: Bekleyen niyet popup'ı dışında da (ör. yönlendirme ekranları) kullanılabilir (DRY).
 * Sekme arka plandayken (`document.hidden`) sayım durur: kullanıcı görmediği bir onay penceresi
 * onun adına işlem yapmamalı. Görünür olunca kaldığı yerden devam eder.
 * Referans: youthside-2026-ui/panelim/profilim → returnToJobCountdown (setInterval)
 */

import { useEffect, useRef, useState } from 'react';

interface CountdownOptions {
  /** false iken sayım durur (ör. gönderim sürerken veya kullanıcı formu açtığında). */
  readonly running: boolean;
  readonly onDone: () => void;
}

export function useCountdown(seconds: number, { running, onDone }: CountdownOptions): { remaining: number; paused: boolean } {
  const [remaining, setRemaining] = useState(seconds);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const onDoneRef = useRef(onDone);
  const firedRef = useRef(false);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const sync = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  const ticking = running && visible && remaining > 0;
  useEffect(() => {
    if (!ticking) return;
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [ticking]);

  useEffect(() => {
    if (running && visible && remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      onDoneRef.current();
    }
  }, [running, visible, remaining]);

  return { remaining, paused: running && !visible };
}
