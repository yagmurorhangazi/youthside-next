/**
 * [MODÜL: FOTOĞRAF VE CV YÜKLEME — REACT ISLAND]
 * Amaç: Profil fotoğrafı (jpg/png/webp, ≤5 MB) ve CV (pdf/doc/docx, ≤10 MB) yüklemek.
 * CV başvuru için zorunludur (profil doluluğunun %35'i). Dosya türü/boyutu istemcide hızlı geri
 * bildirim için, sunucuda ise güvenlik için tekrar doğrulanır.
 */

import { useRef, useState, type ChangeEvent } from 'react';
import { actions } from 'astro:actions';
import { Camera, FileText, Upload } from 'lucide-react';
import { toFormErrors } from '@/shared/lib/action-result';
import { FormAlert, UserAvatar } from '@/shared/ui';

interface MediaUploadsProps {
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly resumeUrl: string | null;
}

const MB = 1024 * 1024;

type UploadKind = 'avatar' | 'resume';

const RULES: Record<UploadKind, { types: string[]; maxBytes: number; label: string }> = {
  avatar: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 5 * MB, label: 'Profil fotoğrafı' },
  resume: {
    types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxBytes: 10 * MB,
    label: 'CV',
  },
};

export default function MediaUploads({ name, avatarUrl: initialAvatar, resumeUrl: initialResume }: MediaUploadsProps) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [resumeUrl, setResumeUrl] = useState(initialResume);
  const [pending, setPending] = useState<UploadKind | null>(null);
  const [feedback, setFeedback] = useState<{ variant: 'success' | 'error'; text: string } | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const resumeInput = useRef<HTMLInputElement>(null);

  const upload = (kind: UploadKind) => async (event: ChangeEvent<HTMLInputElement>) => {
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
    } else {
      const { data, error } = await actions.profile.uploadResume(form);
      setPending(null);
      if (error) return setFeedback({ variant: 'error', text: toFormErrors(error).message ?? 'Yükleme başarısız.' });
      setResumeUrl(data.resumeUrl);
    }
    setFeedback({ variant: 'success', text: `${rule.label} kaydedildi.` });
  };

  const tile = 'flex items-center gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm';
  const button =
    'inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-bold text-gray-700 transition hover:border-primary-300 hover:text-primary-700 disabled:opacity-50';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className={tile}>
          <UserAvatar name={name} src={avatarUrl} size="lg" className="scale-125" />
          <div className="min-w-0 flex-1 pl-2">
            <p className="font-bold text-gray-900">Profil fotoğrafı</p>
            <p className="text-xs text-gray-500">JPG, PNG veya WEBP · en fazla 5 MB</p>
            <button type="button" className={`${button} mt-3`} onClick={() => avatarInput.current?.click()} disabled={pending !== null}>
              <Camera size={16} aria-hidden="true" />
              {pending === 'avatar' ? 'Yükleniyor…' : avatarUrl ? 'Değiştir' : 'Fotoğraf yükle'}
            </button>
            <input ref={avatarInput} type="file" accept={RULES.avatar.types.join(',')} onChange={upload('avatar')} className="sr-only" aria-label="Profil fotoğrafı seç" />
          </div>
        </div>

        <div className={tile}>
          <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${resumeUrl ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <FileText size={26} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-900">CV / Özgeçmiş</p>
            <p className="text-xs text-gray-500">
              {resumeUrl ? (
                <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-600 hover:underline">
                  Yüklü CV’yi görüntüle
                </a>
              ) : (
                'Başvuru için zorunlu · PDF, DOC, DOCX'
              )}
            </p>
            <button type="button" className={`${button} mt-3`} onClick={() => resumeInput.current?.click()} disabled={pending !== null}>
              <Upload size={16} aria-hidden="true" />
              {pending === 'resume' ? 'Yükleniyor…' : resumeUrl ? 'Yenisini yükle' : 'CV yükle'}
            </button>
            <input ref={resumeInput} type="file" accept={RULES.resume.types.join(',')} onChange={upload('resume')} className="sr-only" aria-label="CV dosyası seç" />
          </div>
        </div>
      </div>
      {feedback && <FormAlert variant={feedback.variant}>{feedback.text}</FormAlert>}
    </div>
  );
}
