/**
 * [MODÜL: BEKLEYEN NİYET POPUP'I]
 * Amaç: Yarıda kalan başvuruyu/kaydı kullanıcıya hatırlatıp tamamlatmak.
 *   - confirm_auto   → 5 sn geri sayım; itiraz edilmezse kendisi gönderir ("Şimdi gönder" ile beklemeden)
 *   - confirm_manual → zorunlu soru/sözleşme var; form gösterilir, otomatik gönderilmez (KVKK açık rıza)
 *   - closed         → ilan/etkinlik kapandı; kullanıcı bilgilendirilir
 * Erişilebilirlik: odak ana düğmede, geri sayım `role="timer"`, durum değişiklikleri `aria-live` ile
 * duyurulur; sekme arka plandayken sayım durur (useCountdown).
 * Referans: youthside-2026-ui/panelim/profilim → "Başvuruya Hazırsın" modalı + returnToJobCountdown
 */

import { useRef, useState } from 'react';
import { ArrowRight, CalendarCheck, CheckCircle2, Clock, Send, Ticket } from 'lucide-react';
import { ROUTES } from '@/config/site';
import { allRequiredAccepted, ContractChecklist } from '@/features/common/components/ContractChecklist';
import { ApplicationForm } from '@/features/jobs/components/ApplicationForm';
import { useCountdown } from '@/shared/lib/use-countdown';
import { Button, ButtonLink, Modal } from '@/shared/ui';
import { AUTO_CONFIRM_SECONDS } from '../lib/intent-rules';
import { submitIntent } from '../submit';
import type { IntentPrompt } from '../types';

interface PendingIntentDialogProps {
  readonly prompt: IntentPrompt;
  /** "Daha sonra" veya pencereyi kapatma: niyet korunur. */
  readonly onSnooze: () => void;
  /** "Vazgeç": niyet silinir. */
  readonly onDiscard: () => void;
  /** Gönderildi veya kapandı: niyet sunucuda zaten temizlendi, pencere kapanır. */
  readonly onFinish: () => void;
  /** Gönderimde profil yetersiz çıktı (ör. CV silinmiş): popup kapanır, şerit profil tamamlamayı söyler. */
  readonly onProfileIncomplete: () => void;
}

type View = 'auto' | 'manual' | 'sending' | 'success' | 'closed' | 'error';

const COPY = {
  job: {
    heading: 'Başvurunu tamamlayalım',
    auto: 'Profilin hazır. Başvurun otomatik olarak gönderilecek.',
    now: 'Şimdi başvur',
    success: 'Başvurun alındı!',
    successText: 'ekibi başvurunu değerlendirecek. Süreci panelinden takip edebilirsin.',
    closed: 'Bu ilan artık başvuru kabul etmiyor. Benzer ilanlara göz atabilirsin.',
    listHref: ROUTES.jobs,
    listLabel: 'İlanlara göz at',
    myHref: ROUTES.myApplications,
    myLabel: 'Başvurularım',
  },
  event: {
    heading: 'Kaydını tamamlayalım',
    auto: 'Etkinlik kaydın otomatik olarak tamamlanacak.',
    now: 'Şimdi kaydol',
    success: 'Kaydın tamamlandı!',
    successText: 'etkinliği için kaydın alındı. Detaylar e-posta adresine gönderilecek.',
    closed: 'Bu etkinliğe artık kayıt alınmıyor. Yaklaşan etkinliklere göz atabilirsin.',
    listHref: ROUTES.events,
    listLabel: 'Etkinliklere göz at',
    myHref: ROUTES.myEvents,
    myLabel: 'Etkinliklerim',
  },
} as const;

const RING_RADIUS = 26;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function initialView(step: IntentPrompt['step']): View {
  if (step === 'confirm_manual') return 'manual';
  if (step === 'closed') return 'closed';
  return 'auto';
}

export default function PendingIntentDialog({ prompt, onSnooze, onDiscard, onFinish, onProfileIncomplete }: PendingIntentDialogProps) {
  const { intent, questions, contracts } = prompt;
  const copy = COPY[intent.kind];
  const [view, setView] = useState<View>(() => initialView(prompt.step));
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [formBusy, setFormBusy] = useState(false);
  // Kit'in Button'ı ref almaz; odaklanacak düğme `data-autofocus` ile işaretlenir ve gövde render
  // edilince bulunur. Modal ilk odağı (kapat düğmesi yerine) ana aksiyona verir.
  const primaryRef = useRef<HTMLElement | null>(null);
  const bodyRef = (node: HTMLDivElement | null) => {
    primaryRef.current = node?.querySelector<HTMLElement>('[data-autofocus]') ?? null;
  };

  const send = async (acceptedContracts: readonly string[] = []) => {
    setView('sending');
    const outcome = await submitIntent(intent, acceptedContracts);
    if (outcome.status === 'done') return setView('success');
    if (outcome.status === 'needs_input') return setView('manual');
    if (outcome.status === 'profile_incomplete') return onProfileIncomplete();
    setError(outcome.message);
    setView('error');
  };

  const { remaining, paused } = useCountdown(AUTO_CONFIRM_SECONDS, { running: view === 'auto', onDone: () => void send() });

  const busy = view === 'sending' || formBusy;
  const close = () => {
    if (busy) return;
    if (view === 'success' || view === 'closed') onFinish();
    else onSnooze();
  };

  const status =
    view === 'sending'
      ? 'Gönderiliyor…'
      : view === 'success'
        ? copy.success
        : view === 'auto'
          ? `${copy.auto} ${AUTO_CONFIRM_SECONDS} saniye içinde gönderilecek.`
          : '';

  return (
    <Modal
      isOpen
      onClose={close}
      title={view === 'success' ? undefined : copy.heading}
      size={view === 'manual' && intent.kind === 'job' ? 'lg' : 'md'}
      closeOnOutsideClick={!busy}
      closeOnEscape={!busy}
      initialFocusRef={primaryRef}
    >
      <div ref={bodyRef}>
        {/* Ekran okuyucuya durum değişikliği yalnızca bir kez duyurulur (her saniye değil). */}
        <p className="sr-only" aria-live="polite">
          {status}
        </p>

        {view !== 'success' && (
          <div className="mx-5 mb-5 flex items-center gap-4 rounded-2xl bg-gray-50 p-4 sm:mx-8">
            {intent.imageUrl ? (
              <img src={intent.imageUrl} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl bg-white object-cover" />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600">
                {intent.kind === 'job' ? <Send size={22} aria-hidden="true" /> : <Ticket size={22} aria-hidden="true" />}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-primary-600">
                {intent.kind === 'job' ? 'İlan başvurusu' : 'Etkinlik kaydı'}
              </p>
              <a href={intent.path} className="block truncate font-bold text-gray-900 hover:text-primary-700">
                {intent.title}
              </a>
              <p className="truncate text-sm text-gray-500">{intent.companyName}</p>
            </div>
          </div>
        )}

        {(view === 'auto' || view === 'sending') && (
          <div className="px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0" role="timer" aria-label={`${remaining} saniye`}>
                <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden="true">
                  <circle cx="32" cy="32" r={RING_RADIUS} fill="none" strokeWidth="6" className="stroke-gray-100" />
                  <circle
                    cx="32"
                    cy="32"
                    r={RING_RADIUS}
                    fill="none"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={RING_LENGTH}
                    strokeDashoffset={RING_LENGTH * (1 - remaining / AUTO_CONFIRM_SECONDS)}
                    className="stroke-primary-500 motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000 motion-safe:ease-linear"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-gray-900" aria-hidden="true">
                  {view === 'sending' ? '…' : remaining}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {view === 'sending' ? 'Gönderiliyor, lütfen bekle…' : copy.auto}
                {paused && <span className="mt-1 block text-xs text-gray-400">Sekmeye döndüğünde geri sayım devam eder.</span>}
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={onSnooze} disabled={busy}>
                Daha sonra
              </Button>
              <Button data-autofocus type="button" icon={intent.kind === 'job' ? Send : Ticket} isLoading={view === 'sending'} onClick={() => void send()}>
                {copy.now}
              </Button>
            </div>
            <button type="button" onClick={onDiscard} disabled={busy} className="mx-auto mt-3 block min-h-11 px-3 text-xs font-semibold text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline disabled:opacity-50">
              Bu {intent.kind === 'job' ? 'başvurudan' : 'kayıttan'} vazgeç
            </button>
          </div>
        )}

        {view === 'manual' && intent.kind === 'job' && (
          <ApplicationForm
            jobId={intent.targetId}
            jobSlug={intent.slug}
            jobTitle={intent.title}
            companyName={intent.companyName}
            questions={questions}
            contracts={contracts}
            onApplied={() => setView('success')}
            onProfileIncomplete={onProfileIncomplete}
            onCancel={onSnooze}
            onPendingChange={setFormBusy}
          />
        )}

        {view === 'manual' && intent.kind === 'event' && (
          <div className="space-y-5 px-5 pb-6 sm:px-8 sm:pb-8">
            <ContractChecklist contracts={contracts} accepted={accepted} onChange={setAccepted} />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={onSnooze}>
                Daha sonra
              </Button>
              <Button data-autofocus type="button" icon={Ticket} disabled={!allRequiredAccepted(contracts, accepted)} onClick={() => void send(accepted)}>
                Onayla ve kaydol
              </Button>
            </div>
          </div>
        )}

        {view === 'error' && (
          <div className="px-5 pb-6 sm:px-8 sm:pb-8">
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={onSnooze}>
                Daha sonra
              </Button>
              <Button data-autofocus type="button" onClick={() => setView(prompt.step === 'confirm_manual' ? 'manual' : 'auto')}>
                Tekrar dene
              </Button>
            </div>
          </div>
        )}

        {view === 'closed' && (
          <div className="px-5 pb-6 sm:px-8 sm:pb-8">
            <p className="flex items-start gap-2 text-sm text-gray-600">
              <Clock size={18} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
              {copy.closed}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button data-autofocus type="button" variant="ghost" onClick={onFinish}>
                Kapat
              </Button>
              <ButtonLink href={copy.listHref} icon={ArrowRight}>
                {copy.listLabel}
              </ButtonLink>
            </div>
          </div>
        )}

        {view === 'success' && (
          <div className="px-6 pb-8 pt-10 text-center sm:px-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              {intent.kind === 'job' ? <CheckCircle2 size={34} aria-hidden="true" /> : <CalendarCheck size={34} aria-hidden="true" />}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{copy.success}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
              <strong>{intent.kind === 'job' ? intent.companyName : intent.title}</strong> {copy.successText}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <ButtonLink href={copy.myHref} icon={ArrowRight}>
                {copy.myLabel}
              </ButtonLink>
              <Button data-autofocus variant="secondary" onClick={onFinish}>
                Kapat
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
