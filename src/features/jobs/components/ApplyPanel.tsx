/**
 * [MODÜL: İLAN BAŞVURU PANELİ — REACT ISLAND]
 * Amaç: İlan detayında başvuru durumunu göstermek ve başvuru formunu yönetmek.
 *
 * Durum (`state`) sunucuda `resolveApplyState` ile hesaplanır; bu bileşen yalnızca o duruma göre
 * arayüz çizer ve "hazır" durumunda başvuru formunu açar (SRP).
 * Masaüstünde kenar çubuğunda kart, mobilde ekranın altına sabit aksiyon çubuğu olarak görünür.
 * Gönderim `actions.participation.apply` ile yapılır; token tarayıcıya hiç inmez.
 */

import { useState, type FormEvent } from 'react';
import { actions } from 'astro:actions';
import { AlertCircle, ArrowRight, CheckCircle2, Clock, ExternalLink, LogIn, Send, UserRoundCog } from 'lucide-react';
import { ROUTES } from '@/config/site';
import { allRequiredAccepted, ContractChecklist } from '@/features/common/components/ContractChecklist';
import type { Contract } from '@/features/common/types';
import { toFormErrors } from '@/shared/lib/action-result';
import { Button, ButtonLink, Modal } from '@/shared/ui';
import type { ApplyState } from '../lib/apply-state';
import type { JobQuestion } from '../types';
import { isAnswered, QuestionField, type Answer } from './QuestionField';

interface ApplyPanelProps {
  readonly jobId: string;
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

type Answers = Record<string, Answer>;

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
  const { jobId, jobTitle, companyName, jobPath, deadlineLabel, externalUrl, questions, contracts, completeness } = props;
  const [state, setState] = useState<ApplyState>(props.initialState);
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [accepted, setAccepted] = useState<string[]>([]);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<readonly string[]>(completeness?.missing ?? []);

  const loginHref = `${ROUTES.login}?redirect=${encodeURIComponent(jobPath)}`;
  const profileHref = `${ROUTES.profile}?redirect=${encodeURIComponent(jobPath)}`;

  const questionErrors: Record<string, string> = submitted
    ? Object.fromEntries(questions.filter((q) => q.isRequired && !isAnswered(answers[q.id])).map((q) => [q.id, 'Bu soru zorunlu.']))
    : {};
  const contractsOk = allRequiredAccepted(contracts, accepted);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setMessage(null);
    const unanswered = questions.some((q) => q.isRequired && !isAnswered(answers[q.id]));
    if (unanswered || !contractsOk) {
      setMessage('Lütfen zorunlu alanları doldur.');
      return;
    }

    setPending(true);
    const { data, error } = await actions.participation.apply({
      jobId,
      coverLetter: coverLetter.trim() || undefined,
      acceptedContracts: accepted,
      answers: questions.filter((q) => isAnswered(answers[q.id])).map((q) => ({ questionId: q.id, answer: answers[q.id] })),
    });
    setPending(false);

    if (error) {
      setMessage(toFormErrors(error).message);
      return;
    }
    if (data.status === 'ok' || data.status === 'already_done') {
      setState('applied');
      return;
    }
    if (data.status === 'profile_incomplete') {
      setMissingFields(data.missingFields);
      setState('incomplete');
      setOpen(false);
      return;
    }
    setMessage(data.message);
  };

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
          <ButtonLink href={loginHref} icon={LogIn} className="w-full">
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
          <ButtonLink href={profileHref} icon={UserRoundCog} className="w-full">
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
            <a href={`${ROUTES.register}?redirect=${encodeURIComponent(jobPath)}`} className="font-bold text-primary-600 hover:underline">
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
          <form onSubmit={onSubmit} noValidate className="space-y-6 px-5 pb-6 sm:px-8 sm:pb-8">
            <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
              <strong className="text-gray-900">{jobTitle}</strong> · {companyName}
              <br />
              Profil bilgilerin ve yüklediğin CV başvuruna otomatik eklenecek.
            </p>

            {questions.map((question) => (
              <QuestionField
                key={question.id}
                question={question}
                value={answers[question.id] ?? ''}
                onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
                error={questionErrors[question.id]}
              />
            ))}

            <div>
              <label htmlFor="cover-letter" className="mb-2 block text-sm font-semibold text-gray-800">
                Ön yazı <span className="font-normal text-gray-400">(isteğe bağlı)</span>
              </label>
              <textarea
                id="cover-letter"
                rows={4}
                maxLength={5000}
                value={coverLetter}
                onChange={(event) => setCoverLetter(event.target.value)}
                placeholder="Bu pozisyon için neden uygun olduğunu kısaca anlat."
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
              />
            </div>

            <ContractChecklist contracts={contracts} accepted={accepted} onChange={setAccepted} showErrors={submitted} />

            {message && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                {message}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Vazgeç
              </Button>
              <Button type="submit" icon={Send} isLoading={pending}>
                Başvuruyu gönder
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
