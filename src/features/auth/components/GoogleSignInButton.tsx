/**
 * [MODÜL: GOOGLE İLE GİRİŞ DÜĞMESİ — REACT ISLAND]
 * Amaç: Google Identity Services (GIS) düğmesini çizmek; dönen `id_token`'ı sunucuya
 *       (`auth.googleLogin` action'ı) iletip oturumu açmak.
 *
 * Neden Google'ın kendi düğmesi: Marka kurallarına uygundur, erişilebilirdir ve tıklama doğrudan
 * Google'a gider (2026-ui'deki görünmez katman hilesine gerek kalmaz).
 * GIS betiği yalnızca bu düğmenin bulunduğu sayfada (giriş/kayıt) ve yalnızca bir kez yüklenir.
 * Token tarayıcıda saklanmaz; doğrulamayı API yapar, oturum httpOnly çerezde açılır.
 * Referans: youthside-2026-ui/giris-yap → initGoogleSignIn / handleGoogleCredential
 */

import { useEffect, useRef, useState } from 'react';
import { actions } from 'astro:actions';
import { toFormErrors } from '@/shared/lib/action-result';

interface GoogleSignInButtonProps {
  readonly clientId: string;
  readonly redirect: string;
  readonly mode: 'login' | 'register';
}

interface GoogleId {
  initialize(config: { client_id: string; callback: (response: { credential?: string }) => void; context?: string; ux_mode?: 'popup'; itp_support?: boolean }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise: Promise<GoogleId> | null = null;

/** Betik sayfa başına bir kez eklenir; reklam engelleyici vb. ile yüklenemezse hata verir. */
function loadGoogleIdentity(): Promise<GoogleId> {
  scriptPromise ??= new Promise<GoogleId>((resolve, reject) => {
    const ready = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('GIS hazır değil')));
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = ready;
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('GIS yüklenemedi'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** GIS düğmesi 200–400 px genişlik kabul eder. */
const clampWidth = (width: number) => Math.round(Math.min(400, Math.max(200, width)));

export default function GoogleSignInButton({ clientId, redirect, mode }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'pending' | 'unavailable'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const onCredential = async ({ credential }: { credential?: string }) => {
      if (!credential) return;
      setStatus('pending');
      setError(null);
      const { data, error: actionError } = await actions.auth.googleLogin({ idToken: credential, redirect });
      if (actionError) {
        setStatus('ready');
        setError(toFormErrors(actionError).message ?? 'Google ile giriş yapılamadı. Lütfen tekrar dene.');
        return;
      }
      window.location.assign(data.redirect);
    };

    loadGoogleIdentity()
      .then((google) => {
        const container = containerRef.current;
        if (cancelled || !container) return;
        google.initialize({ client_id: clientId, callback: onCredential, context: mode === 'register' ? 'signup' : 'signin', ux_mode: 'popup', itp_support: true });
        google.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: mode === 'register' ? 'signup_with' : 'signin_with',
          logo_alignment: 'center',
          locale: 'tr',
          width: clampWidth(container.offsetWidth),
        });
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, redirect, mode]);

  return (
    <div>
      <div className="relative flex min-h-11 items-center justify-center">
        <div ref={containerRef} className="w-full [&>div]:mx-auto" aria-busy={status !== 'ready'} />
        {status === 'loading' && <div className="absolute inset-x-0 mx-auto h-10 max-w-[400px] animate-pulse rounded-md bg-slate-200" aria-hidden="true" />}
        {status === 'pending' && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-md bg-white text-sm font-semibold text-slate-600" role="status">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-primary-600" aria-hidden="true" />
            Google ile giriş yapılıyor…
          </div>
        )}
        {status === 'unavailable' && (
          <p className="text-center text-xs text-slate-500" role="status">
            Google girişi yüklenemedi (reklam engelleyici etkin olabilir).
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-center text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
