/**
 * [MODÜL: İLAN BAŞVURU PANELİ — REACT ISLAND]
 * Amaç: İlan detayında başvuru durumunu göstermek ve başvuru formunu yönetmek.
 *
 * Durum (`state`) sunucuda `resolveApplyState` ile hesaplanır; bu bileşen yalnızca o duruma göre
 * arayüz çizer ve "hazır" durumunda başvuru formunu açar (SRP).
 * Masaüstünde kenar çubuğunda kart, mobilde ekranın altına sabit aksiyon çubuğu olarak görünür.
 * Gönderim ortak `ApplicationForm` ile yapılır; token tarayıcıya hiç inmez.
 * Misafir/eksik profil linkleri tıklanınca bekleyen niyet kaydedilir (giriş veya profil tamamlama
 * sonrası popup ile hatırlatılır). Popup aynı sayfada başvuruyu gönderirse `$participationDone`
 * sinyaliyle bu panel de "Başvurun alındı" durumuna geçer.
 */

import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { AlertCircle, ArrowRight, CheckCircle2, Clock, ExternalLink, LogIn, Send, UserRoundCog } from '@/shared/ui';
import { ROUTES } from '@/config/site';
import type { Contract } from '@/features/common/types';
import { captureIntentOnClick } from '@/features/intent/capture';
import { $participationDone } from '@/features/intent/store';
import { Button, ButtonLink, Modal } from '@/shared/ui';
import type { ApplyState } from '../lib/apply-state';
import type { JobQuestion } from '../types';
import { ApplicationForm } from './ApplicationForm';

interface ApplyPanelProps {
  readonly jobId: string;
  readonly jobSlug: string;
  readonly jobTitle: string;
  readonly companyName: string;
  readonly jobPath: string;
  readonly initialState: ApplyState;
  readonly deadlineLabel: string;
  readonly externalUrl: string | null;
  readonly questions: readonly JobQuestion[];
  readonly contracts: readonly Contract[];
  readonly completeness: { readonly percentage: number; readonly threshold: number; readonly missing: readonly string[] } | null;
}

/** Durum başına kart içeriği (başlık + açıklama). */
const COPY: Record<ApplyState, { title: string; text: string }> = {
  expired: { title: 'Başvuru süresi doldu', text: 'Bu ilan artık başvuru kabul etmiyor. Benzer ilanlara göz atabilirsin.' },
  external: { title: 'Şirket sitesinde başvur', text: 'Bu ilana başvurular şirketin kendi kariyer sayfasından alınıyor.' },
  guest: { title: 'Başvurmak için giriş yap', text: 'Ücretsiz Youthside profilinle bu ilana tek tıkla başvurabilirsin.' },
  applied: { title: 'Başvurun alındı', text: 'Başvurunun durumunu panelinden takip edebilirsin.' },
  incomplete: { title: 'Profilini tamamla', text: 'Başvuru yapabilmek için profilinin en az %75 dolu olması gerekiyor.' },
  ready: { title: 'Bu ilana başvur', text: 'Profil bilgilerin ve CV’n başvuruna otomatik eklenir.' },
};

export default function ApplyPanel(props: ApplyPanelProps) {
  const { jobId, jobSlug, jobTitle, companyName, jobPath, deadlineLabel, externalUrl, questions, contracts, completeness } = props;
  const [state, setState] = useState<ApplyState>(props.initialState);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [missingFields, setMissingFields] = useState<readonly string[]>(completeness?.missing ?? []);
  const participation = useStore($participationDone);

  // Bekleyen niyet popup'ı bu ilana başvurduysa panel de güncellenir.
  useEffect(() => {
    if (participation?.kind === 'job' && participation.targetId === jobId) setState('applied');
  }, [participation, jobId]);

  const loginHref = `${ROUTES.login}?redirect=${encodeURIComponent(jobPath)}`;
  const profileHref = `${ROUTES.profile}?redirect=${encodeURIComponent(jobPath)}`;
  const rememberIntent = captureIntentOnClick('job', jobSlug);

  const primaryAction = (() => {
    switch (state) {
      case 'ready':
        return (
          <Button type="button" icon={Send} className="w-full" onClick={() => setOpen(true)}>
            Hemen Başvur
          </Button>
        );
      case 'guest':
        return (
          <ButtonLink href={loginHref} icon={LogIn} className="w-full" onClick={rememberIntent}>
            Giriş yap ve başvur
          </ButtonLink>
        );
      case 'external':
        return (
          <ButtonLink href={externalUrl ?? '#'} target="_blank" rel="noopener noreferrer" icon={ExternalLink} className="w-full">
            Şirket sitesinde başvur
          </ButtonLink>
        );
      case 'incomplete':
        return (
          <ButtonLink href={profileHref} icon={UserRoundCog} className="w-full" onClick={rememberIntent}>
            Profilimi tamamla
          </ButtonLink>
        );
      case 'applied':
        return (
          <ButtonLink href={ROUTES.myApplications} variant="secondary" icon={CheckCircle2} className="w-full">
            Başvurularıma git
          </ButtonLink>
        );
      default:
        return (
          <ButtonLink href={ROUTES.jobs} variant="secondary" className="w-full">
            Diğer ilanlara göz at
          </ButtonLink>
        );
    }
  })();

  const copy = COPY[state];
  const tone = state === 'applied' ? 'text-emerald-600' : state === 'expired' ? 'text-gray-400' : 'text-primary-600';
  const StateIcon = state === 'applied' ? CheckCircle2 : state === 'expired' ? Clock : state === 'incomplete' ? AlertCircle : Send;

  return (
    <>
      {/* Kenar çubuğu kartı */}
      <section aria-labelledby="apply-title" className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 ${tone}`}>
            <StateIcon size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 id="apply-title" className="font-bold text-gray-900">
              {copy.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{copy.text}</p>
          </div>
        </div>

        {state === 'incomplete' && completeness && (
          <div className="mb-4">
            <div className="mb-1.5 flex justify-between text-xs font-semibold text-gray-600">
              <span>Profil doluluğu</span>
              <span>%{completeness.percentage}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={completeness.percentage} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-linear-to-r from-primary-500 to-amber-400" style={{ width: `${completeness.percentage}%` }} />
            </div>
            {missingFields.length > 0 && <p className="mt-3 text-xs text-gray-500">Eksik: {missingFields.join(', ')}</p>}
          </div>
        )}

        {primaryAction}
        {state === 'guest' && (
          <p className="mt-3 text-center text-sm text-gray-500">
            Hesabın yok mu?{' '}
            <a href={`${ROUTES.register}?redirect=${encodeURIComponent(jobPath)}`} onClick={rememberIntent} className="font-bold text-primary-600 hover:underline">
              Ücretsiz kayıt ol
            </a>
          </p>
        )}
        <p className="mt-4 flex items-center justify-center gap-1.5 border-t border-gray-100 pt-4 text-xs font-medium text-gray-500">
          <Clock size={14} aria-hidden="true" />
          Son başvuru: {deadlineLabel}
        </p>
      </section>

      {/* Mobil sabit aksiyon çubuğu */}
      <div className="animate-slide-up fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-900">{jobTitle}</p>
            <p className="truncate text-xs text-gray-500">{state === 'applied' ? 'Başvurun alındı' : `Son başvuru: ${deadlineLabel}`}</p>
          </div>
          <div className="w-44 shrink-0">{primaryAction}</div>
        </div>
      </div>

      {/* Başvuru formu */}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Başvuru formu" size="lg" closeOnOutsideClick={!pending}>
        {state === 'applied' ? (
          <div className="px-6 pb-8 pt-2 text-center sm:px-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <CheckCircle2 size={34} aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Başvurun alındı!</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
              <strong>{companyName}</strong> ekibi başvurunu değerlendirecek. Süreci panelinden takip edebilirsin.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <ButtonLink href={ROUTES.myApplications} icon={ArrowRight}>
                Başvurularım
              </ButtonLink>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Kapat
              </Button>
            </div>
          </div>
        ) : (
          <ApplicationForm
            jobId={jobId}
            jobSlug={jobSlug}
            jobTitle={jobTitle}
            companyName={companyName}
            questions={questions}
            contracts={contracts}
            onApplied={() => setState('applied')}
            onProfileIncomplete={(fields) => {
              setMissingFields(fields);
              setState('incomplete');
              setOpen(false);
            }}
            onCancel={() => setOpen(false)}
            onPendingChange={setPending}
          />
        )}
      </Modal>
    </>
  );
}
