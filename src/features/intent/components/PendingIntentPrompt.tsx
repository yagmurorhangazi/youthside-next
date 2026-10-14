/**
 * [MODÜL: BEKLEYEN NİYET HATIRLATICISI — GLOBAL REACT ISLAND]
 * Amaç: Yarıda kalan başvuru/kaydı kullanıcı hangi sayfada olursa olsun hatırlatmak ve tamamlatmak.
 *   - Misafir           → ince şerit: "Giriş yap ve devam et" (API çağrısı yok)
 *   - Profil eksik      → şerit: "%X / %75 — Profilimi tamamla"; doluluk eşiği geçince popup açılır
 *   - Hazır             → popup (5 sn otomatik onay veya form)
 *   - "Daha sonra"      → popup bu oturumda kendiliğinden açılmaz; şeritten "Devam et" ile açılır
 *
 * Performans: Layout bu island'ı yalnızca oturumda niyet varken basar. Sunucu sorgusu
 * (`intent.resolve`) yalnızca girişli ve ertelenmemiş durumda yapılır; sonuç sekme oturumunda
 * 60 sn önbelleklenir. Profil formu/yükleme `$completeness` yayınlayınca önbellek atlanır.
 * Aynı niyet başka sekmede tamamlanırsa `BroadcastChannel` ile bu sekmedeki popup kapanır.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '@nanostores/react';
import { actions } from 'astro:actions';
import { ArrowRight, BellRing, LogIn, UserRoundCog, X } from 'lucide-react';
import { ROUTES } from '@/config/site';
import { $completeness } from '@/features/candidate/store';
import type { IntentPrompt, IntentSummary } from '../types';
import PendingIntentDialog from './PendingIntentDialog';

interface PendingIntentPromptProps {
  readonly summary: IntentSummary;
  readonly isLoggedIn: boolean;
  readonly currentPath: string;
}

const CACHE_KEY = 'ys_intent_prompt';
const CACHE_MS = 60_000;
const CHANNEL = 'ys-intent';

function readCache(path: string): IntentPrompt | null {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null') as { path: string; at: number; prompt: IntentPrompt } | null;
    return cached && cached.path === path && Date.now() - cached.at < CACHE_MS ? cached.prompt : null;
  } catch {
    return null;
  }
}

function writeCache(path: string, prompt: IntentPrompt | null) {
  try {
    if (prompt) sessionStorage.setItem(CACHE_KEY, JSON.stringify({ path, at: Date.now(), prompt }));
    else sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // Gizli sekme / kapalı depolama: önbelleksiz devam edilir.
  }
}

export default function PendingIntentPrompt({ summary, isLoggedIn, currentPath }: PendingIntentPromptProps) {
  const [prompt, setPrompt] = useState<IntentPrompt | null>(null);
  const [snoozed, setSnoozed] = useState(summary.snoozed);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const completeness = useStore($completeness);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const finish = useCallback((broadcast: boolean) => {
    writeCache(summary.path, null);
    setDialogOpen(false);
    setHidden(true);
    if (broadcast) channelRef.current?.postMessage('done');
  }, [summary.path]);

  const load = useCallback(
    async (force: boolean) => {
      const cached = force ? null : readCache(summary.path);
      let next = cached;
      if (!next) {
        const { data, error } = await actions.intent.resolve();
        if (error) return; // Geçici hata: hatırlatma bir sonraki sayfada tekrar denenir.
        next = data;
      }
      if (!next || next.step === 'done') return finish(false);
      writeCache(summary.path, next);
      setPrompt(next);
      setDialogOpen(next.step === 'confirm_auto' || next.step === 'confirm_manual' || next.step === 'closed');
    },
    [summary.path, finish],
  );

  // İlk açılış: yalnızca girişli ve ertelenmemişse sunucuya sorulur.
  useEffect(() => {
    if (isLoggedIn && !summary.snoozed) void load(false);
  }, [isLoggedIn, summary.snoozed, load]);

  // Profil eşiği bu sayfada geçildi (form kaydı / CV) → popup hemen açılsın.
  useEffect(() => {
    if (completeness?.isEligible && prompt?.step === 'complete_profile' && !snoozed) void load(true);
  }, [completeness, prompt?.step, snoozed, load]);

  // Sekmeler arası: biri tamamlarsa diğerleri kapanır (çift gönderim olursa API 409 → yine tamamlandı sayılır).
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => {
      if (event.data === 'done') finish(false);
    };
    channelRef.current = channel;
    return () => channel.close();
  }, [finish]);

  const snooze = () => {
    setDialogOpen(false);
    setSnoozed(true);
    writeCache(summary.path, null);
    void actions.intent.dismiss({ mode: 'snooze' });
  };

  const discard = () => {
    finish(true);
    void actions.intent.dismiss({ mode: 'discard' });
  };

  const resume = async () => {
    setSnoozed(false);
    await actions.intent.dismiss({ mode: 'resume' });
    await load(true);
  };

  if (hidden) return null;

  const isJob = summary.kind === 'job';
  const noun = isJob ? 'başvurun' : 'etkinlik kaydın';
  const onProfilePage = currentPath === ROUTES.profile;

  let message: string;
  let action: ReactNode = null;
  if (!isLoggedIn) {
    message = `“${summary.title}” için ${noun} seni bekliyor.`;
    action = (
      <a href={`${ROUTES.login}?redirect=${encodeURIComponent(summary.path)}`} className={actionClass}>
        <LogIn size={15} aria-hidden="true" /> Giriş yap ve devam et
      </a>
    );
  } else if (snoozed) {
    message = `“${summary.title}” için ${noun} yarım kaldı.`;
    action = (
      <button type="button" onClick={() => void resume()} className={actionClass}>
        Devam et <ArrowRight size={15} aria-hidden="true" />
      </button>
    );
  } else if (prompt?.step === 'complete_profile') {
    const progress = prompt.completeness ? ` (şu an %${completeness?.percentage ?? prompt.completeness.percentage})` : '';
    message = onProfilePage
      ? `Profilini %${prompt.completeness?.threshold ?? 75} doldurduğunda “${summary.title}” başvurun otomatik hazırlanacak${progress}.`
      : `“${summary.title}” başvurusu için profilini tamamlaman gerekiyor${progress}.`;
    action = onProfilePage ? null : (
      <a href={ROUTES.profile} className={actionClass}>
        <UserRoundCog size={15} aria-hidden="true" /> Profilimi tamamla
      </a>
    );
  } else {
    // Popup açık ya da durum yükleniyor: şerit gösterilmez.
    message = '';
  }

  return (
    <>
      {message && !dialogOpen && (
        <aside aria-label="Bekleyen başvuru" className="border-b border-primary-100 bg-primary-50">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8">
            <BellRing size={16} className="shrink-0 text-primary-600" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm font-medium text-primary-900">{message}</p>
            {action}
            <button
              type="button"
              onClick={discard}
              aria-label="Bu hatırlatmayı kapat ve vazgeç"
              className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary-700/70 transition hover:bg-primary-100 hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </aside>
      )}

      {dialogOpen && prompt && (
        <PendingIntentDialog
          key={`${prompt.intent.targetId}-${prompt.step}`}
          prompt={prompt}
          onSnooze={snooze}
          onDiscard={discard}
          onFinish={() => finish(true)}
          onProfileIncomplete={() => {
            setDialogOpen(false);
            setPrompt({ ...prompt, step: 'complete_profile' });
            writeCache(summary.path, null);
          }}
        />
      )}
    </>
  );
}

const actionClass =
  'inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-bold text-primary-700 shadow-sm transition hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';
