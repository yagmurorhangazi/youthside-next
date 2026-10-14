/**
 * [MODÜL: İLAN BAŞVURU FORMU — ORTAK]
 * Amaç: Ön eleme soruları + ön yazı + sözleşme onayı ile başvuruyu göndermek.
 *
 * Neden ayrı: Aynı form hem ilan detayındaki `ApplyPanel` modalında hem de bekleyen niyet
 * popup'ında (zorunlu soru/sözleşme varsa) kullanılır (DRY). Gönderim ve sonuç yorumlama burada;
 * çağıran yalnızca sonuca göre ekranını değiştirir.
 * Başarıda `$participationDone` yayınlanır; aynı sayfadaki diğer island'lar da güncellenir.
 */

import { useId, useState, type FormEvent } from 'react';
import { actions } from 'astro:actions';
import { AlertCircle, Send } from '@/shared/ui';
import { allRequiredAccepted, ContractChecklist } from '@/features/common/components/ContractChecklist';
import type { Contract } from '@/features/common/types';
import { $participationDone } from '@/features/intent/store';
import { toFormErrors } from '@/shared/lib/action-result';
import { Button } from '@/shared/ui';
import type { JobQuestion } from '../types';
import { isAnswered, QuestionField, type Answer } from './QuestionField';

export interface ApplicationFormProps {
  readonly jobId: string;
  readonly jobSlug: string;
  readonly jobTitle: string;
  readonly companyName: string;
  readonly questions: readonly JobQuestion[];
  readonly contracts: readonly Contract[];
  readonly onApplied: () => void;
  readonly onProfileIncomplete: (missingFields: readonly string[]) => void;
  readonly onCancel: () => void;
  /** Gönderim sürerken kapatmayı engellemek için üst bileşene bildirilir. */
  readonly onPendingChange?: (pending: boolean) => void;
}

type Answers = Record<string, Answer>;

export function ApplicationForm(props: ApplicationFormProps) {
  const { jobId, jobSlug, jobTitle, companyName, questions, contracts, onApplied, onProfileIncomplete, onCancel, onPendingChange } = props;
  const uid = useId();
  const [answers, setAnswers] = useState<Answers>({});
  const [accepted, setAccepted] = useState<string[]>([]);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const questionErrors: Record<string, string> = submitted
    ? Object.fromEntries(questions.filter((q) => q.isRequired && !isAnswered(answers[q.id])).map((q) => [q.id, 'Bu soru zorunlu.']))
    : {};

  const setBusy = (value: boolean) => {
    setPending(value);
    onPendingChange?.(value);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setMessage(null);
    const unanswered = questions.some((q) => q.isRequired && !isAnswered(answers[q.id]));
    if (unanswered || !allRequiredAccepted(contracts, accepted)) {
      setMessage('Lütfen zorunlu alanları doldur.');
      return;
    }

    setBusy(true);
    const { data, error } = await actions.participation.apply({
      jobId,
      jobSlug,
      coverLetter: coverLetter.trim() || undefined,
      acceptedContracts: accepted,
      answers: questions.filter((q) => isAnswered(answers[q.id])).map((q) => ({ questionId: q.id, answer: answers[q.id] })),
    });
    setBusy(false);

    if (error) {
      setMessage(toFormErrors(error).message);
      return;
    }
    if (data.status === 'ok' || data.status === 'already_done') {
      $participationDone.set({ kind: 'job', targetId: jobId });
      onApplied();
      return;
    }
    if (data.status === 'profile_incomplete') {
      onProfileIncomplete(data.missingFields);
      return;
    }
    setMessage(data.message);
  };

  return (
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
        <label htmlFor={`${uid}-cover-letter`} className="mb-2 block text-sm font-semibold text-gray-800">
          Ön yazı <span className="font-normal text-gray-400">(isteğe bağlı)</span>
        </label>
        <textarea
          id={`${uid}-cover-letter`}
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
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Vazgeç
        </Button>
        <Button type="submit" icon={Send} isLoading={pending}>
          Başvuruyu gönder
        </Button>
      </div>
    </form>
  );
}
