/**
 * [MODÜL: FOTOĞRAF VE CV YÜKLEME — REACT ISLAND]
 * Amaç: Profil fotoğrafı (jpg/png/webp, ≤5 MB) ve CV (pdf/doc/docx, ≤10 MB) yüklemek.
 * CV başvuru için zorunludur (profil doluluğunun %35'i). Dosya türü/boyutu istemcide hızlı geri
 * bildirim için, sunucuda ise güvenlik için tekrar doğrulanır.
 *
 * CV dosyası olmayan aday "Profilimden CV oluştur" ile PDF'i tarayıcıda üretip yükleyebilir.
 * Her yükleme API'nin döndürdüğü doluluğu `$completeness` ile yayınlar; eşik geçilirse bekleyen
 * başvuru popup'ı açılır. Profil formunun otomatik ürettiği CV `$resumeUrl` ile burada görünür.
 */

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useStore } from '@nanostores/react';
import { actions } from 'astro:actions';
import { Camera, CheckCircle2, FileText, Sparkles, Upload } from 'lucide-react';
import { toFormErrors } from '@/shared/lib/action-result';
import { FormAlert, UserAvatar } from '@/shared/ui';
import { generateAndUploadResume } from '../generate-resume';
import { $completeness, $resumeData, $resumeUrl } from '../store';
import type { ProfileCompleteness, ResumeData } from '../types';

interface MediaUploadsProps {
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly resumeUrl: string | null;
  /** Kayıtlı profil bilgisi; form kaydedilince `$resumeData` ile güncellenir. */
  readonly resumeData: ResumeData;
}

function publishCompleteness(completeness: ProfileCompleteness | null) {
  if (completeness) $completeness.set({ percentage: completeness.percentage, isEligible: completeness.isEligible });
}

const MB = 1024 * 1024;

type UploadKind = 'avatar' | 'resume' | 'generate';

const RULES: Record<Exclude<UploadKind, 'generate'>, { types: string[]; maxBytes: number; label: string }> = {
  avatar: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 5 * MB, label: 'Profil fotoğrafı' },
  resume: {
    types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxBytes: 10 * MB,
    label: 'CV',
  },
};

export default function MediaUploads({ name, avatarUrl: initialAvatar, resumeUrl: initialResume, resumeData }: MediaUploadsProps) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [resumeUrl, setResumeUrl] = useState(initialResume);
  const generatedUrl = useStore($resumeUrl);
  const latestResumeData = useStore($resumeData) ?? resumeData;

  // Profil formu CV'yi otomatik ürettiyse kart güncellenir.
  useEffect(() => {
    if (generatedUrl) setResumeUrl(generatedUrl);
  }, [generatedUrl]);
  const [pending, setPending] = useState<UploadKind | null>(null);
  const [feedback, setFeedback] = useState<{ variant: 'success' | 'error'; text: string } | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const resumeInput = useRef<HTMLInputElement>(null);

  const generate = async () => {
    setPending('generate');
    setFeedback(null);
    const result = await generateAndUploadResume(latestResumeData);
    setPending(null);
    if (!result.ok) return setFeedback({ variant: 'error', text: result.message });
    setResumeUrl(result.resumeUrl);
    publishCompleteness(result.completeness);
    setFeedback({ variant: 'success', text: 'CV’n profil bilgilerinden oluşturuldu ve kaydedildi.' });
  };

  const upload = (kind: Exclude<UploadKind, 'generate'>) => async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const rule = RULES[kind];
    if (!rule.types.includes(file.type)) return setFeedback({ variant: 'error', text: `${rule.label} için desteklenmeyen dosya türü.` });
    if (file.size > rule.maxBytes) return setFeedback({ variant: 'error', text: `${rule.label} en fazla ${rule.maxBytes / MB} MB olabilir.` });

    const form = new FormData();
    form.append('file', file);
    setPending(kind);
    setFeedback(null);

    if (kind === 'avatar') {
      const { data, error } = await actions.profile.uploadAvatar(form);
      setPending(null);
      if (error) return setFeedback({ variant: 'error', text: toFormErrors(error).message ?? 'Yükleme başarısız.' });
      setAvatarUrl(data.avatarUrl);
      publishCompleteness(data.completeness);
    } else {
      const { data, error } = await actions.profile.uploadResume(form);
      setPending(null);
      if (error) return setFeedback({ variant: 'error', text: toFormErrors(error).message ?? 'Yükleme başarısız.' });
      setResumeUrl(data.resumeUrl);
      publishCompleteness(data.completeness);
    }
    setFeedback({ variant: 'success', text: `${rule.label} kaydedildi.` });
  };

  const tile = 'flex min-h-36 items-center gap-4 p-5';
  const button =
    'inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary-300 hover:text-primary-700 disabled:opacity-50';

  return (
    <div className="space-y-4">
      <div className="grid overflow-hidden rounded-[20px] border border-slate-200/70 bg-white shadow-card divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className={tile}>
          <UserAvatar name={name} src={avatarUrl} size="lg" className="scale-110 ring-4 ring-primary-50" />
          <div className="min-w-0 flex-1 pl-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-primary-600">Profil görünümü</p>
            <p className="mt-1 font-semibold text-slate-950">Profil fotoğrafı</p>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">JPG, PNG veya WEBP · en fazla 5 MB</p>
            <button type="button" className={`${button} mt-3`} onClick={() => avatarInput.current?.click()} disabled={pending !== null}>
              <Camera size={16} aria-hidden="true" />
              {pending === 'avatar' ? 'Yükleniyor…' : avatarUrl ? 'Değiştir' : 'Fotoğraf yükle'}
            </button>
            <input ref={avatarInput} type="file" accept={RULES.avatar.types.join(',')} onChange={upload('avatar')} className="sr-only" aria-label="Profil fotoğrafı seç" />
          </div>
        </div>

        <div className={tile}>
          <span className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${resumeUrl ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <FileText size={26} aria-hidden="true" />
            {resumeUrl && <CheckCircle2 size={16} className="absolute -right-1 -top-1 rounded-full bg-white" aria-hidden="true" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-400">Başvuru belgesi</p>
            <p className="mt-1 font-semibold text-slate-950">CV / Özgeçmiş</p>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              {resumeUrl ? (
                <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-600 hover:underline">
                  Yüklü CV’yi görüntüle
                </a>
              ) : (
                'Başvuru için zorunlu · PDF, DOC, DOCX'
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={button} onClick={() => resumeInput.current?.click()} disabled={pending !== null}>
                <Upload size={16} aria-hidden="true" />
                {pending === 'resume' ? 'Yükleniyor…' : resumeUrl ? 'Yenisini yükle' : 'CV yükle'}
              </button>
              <button
                type="button"
                className={button}
                onClick={() => void generate()}
                disabled={pending !== null}
                title={resumeUrl ? 'Mevcut CV’nin yerine profil bilgilerinden yeni bir CV oluşturulur.' : undefined}
              >
                <Sparkles size={16} aria-hidden="true" />
                {pending === 'generate' ? 'Oluşturuluyor…' : resumeUrl ? 'Profilimden yeniden oluştur' : 'Profilimden CV oluştur'}
              </button>
            </div>
            <input ref={resumeInput} type="file" accept={RULES.resume.types.join(',')} onChange={upload('resume')} className="sr-only" aria-label="CV dosyası seç" />
          </div>
        </div>
      </div>
      {feedback && <FormAlert variant={feedback.variant}>{feedback.text}</FormAlert>}
    </div>
  );
}
