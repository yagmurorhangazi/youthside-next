/**
 * [MODÜL: KAYIT FORMU — REACT ISLAND]
 * Amaç: Yeni aday hesabı oluşturmak (candidates/platform-register).
 * API token döndürmez; hesaba doğrulama e-postası gider. Başarıdan sonra kullanıcıya
 * e-postasını doğrulaması gerektiği net biçimde anlatılır.
 */

import { useId, useState, type SubmitEvent } from 'react';
import { actions } from 'astro:actions';
import { ArrowRight, Check, Mail, MailCheck, ShieldCheck, User } from 'lucide-react';
import { ROUTES } from '@/config/site';
import { NO_ERRORS, toFormErrors, withFieldError, type FormErrorState } from '@/shared/lib/action-result';
import { emailIssue } from '@/shared/lib/email';
import { capitalizePersonName } from '@/shared/lib/text';
import { Button, ButtonLink, FormAlert, FormField, Input, NameInput, PasswordInput } from '@/shared/ui';

interface RegisterFormProps {
  readonly redirect: string | null;
}

/** Basit şifre gücü göstergesi: uzunluk + karakter çeşitliliği (0-4). */
function passwordScore(value: string): number {
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-zçğıöşü]/.test(value) && /[A-ZÇĞİÖŞÜ]/.test(value)) score++;
  if (/\d/.test(value) && /[^\p{L}\d]/u.test(value)) score++;
  return score;
}

const STRENGTH = ['Çok zayıf', 'Zayıf', 'Orta', 'İyi', 'Güçlü'];
const STRENGTH_COLORS = ['bg-red-400', 'bg-red-400', 'bg-amber-400', 'bg-lime-500', 'bg-emerald-500'];

export default function RegisterForm({ redirect }: RegisterFormProps) {
  const uid = useId();
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrorState>(NO_ERRORS);
  const [pending, setPending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const onSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '');

    setPending(true);
    setErrors(NO_ERRORS);
    const { data, error } = await actions.auth.register({
      firstName: capitalizePersonName(text('firstName')),
      lastName: capitalizePersonName(text('lastName')),
      email: text('email'),
      password: text('password'),
      passwordConfirm: text('passwordConfirm'),
      acceptTerms: form.get('acceptTerms') === 'on',
    });
    setPending(false);
    if (error) return setErrors(toFormErrors(error));
    setRegisteredEmail(data.email);
  };

  if (registeredEmail) {
    const loginHref = `${ROUTES.login}?email=${encodeURIComponent(registeredEmail)}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`;
    return (
      <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-6 text-center sm:p-8">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm">
          <MailCheck size={32} aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Hesabın oluşturuldu!</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-600">
          <strong className="text-gray-900">{registeredEmail}</strong> adresine bir doğrulama bağlantısı gönderdik. E-postanı doğruladıktan sonra giriş yapabilirsin.
        </p>
        <p className="mt-2 text-xs text-gray-400">E-posta gelmediyse spam klasörünü kontrol et.</p>
        <ButtonLink href={loginHref} className="mt-6 w-full">
          Giriş sayfasına git
        </ButtonLink>
      </div>
    );
  }

  const id = (name: string) => `${uid}-${name}`;
  const score = passwordScore(password);
  // Alandan çıkınca uyar (Türkçe karakter vb.); boş alan için gönderimde sunucu uyarır.
  const checkEmail = (value: string) => setErrors((prev) => withFieldError(prev, 'email', value.trim() ? emailIssue(value) : null));

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {errors.message && <FormAlert>{errors.message}</FormAlert>}

      <ol className="mb-5 flex items-center" aria-label="Kayıt adımları">
        <li className="flex shrink-0 items-center gap-2 text-[11px] font-bold text-primary-700">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-[10px] text-white shadow-sm">1</span>
          Bilgilerin
        </li>
        <li className="mx-3 h-px flex-1 bg-slate-200" aria-hidden="true"></li>
        <li className="flex shrink-0 items-center gap-2 text-[11px] font-bold text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[10px]">2</span>
          E-posta onayı
        </li>
      </ol>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id={id('firstName')} label="Ad" required error={errors.fields.firstName}>
          {(a11y) => <NameInput id={id('firstName')} name="firstName" autoComplete="given-name" icon={User} required autoFocus {...a11y} />}
        </FormField>
        <FormField id={id('lastName')} label="Soyad" required error={errors.fields.lastName}>
          {(a11y) => <NameInput id={id('lastName')} name="lastName" autoComplete="family-name" icon={User} required {...a11y} />}
        </FormField>
      </div>
      <FormField id={id('email')} label="E-posta" required error={errors.fields.email}>
        {(a11y) => (
          <Input
            id={id('email')}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            icon={Mail}
            onBlur={(event) => checkEmail(event.target.value)}
            onChange={(event) => errors.fields.email && checkEmail(event.target.value)}
            required
            {...a11y}
          />
        )}
      </FormField>
      <FormField id={id('password')} label="Şifre" hint="En az 8 karakter" required error={errors.fields.password}>
        {(a11y) => (
          <PasswordInput id={id('password')} name="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required {...a11y} />
        )}
      </FormField>
      {password && (
        <div aria-live="polite" className="-mt-2">
          <div className="flex gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? STRENGTH_COLORS[score] : 'bg-gray-200'}`} />
            ))}
          </div>
          <p className="mt-1.5 text-xs font-semibold text-gray-500">Şifre gücü: <span className="text-gray-700">{STRENGTH[score]}</span></p>
        </div>
      )}
      <FormField id={id('passwordConfirm')} label="Şifre (tekrar)" required error={errors.fields.passwordConfirm}>
        {(a11y) => <PasswordInput id={id('passwordConfirm')} name="passwordConfirm" autoComplete="new-password" required {...a11y} />}
      </FormField>

      <div>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-[13px] leading-5 text-gray-600 transition hover:border-primary-100 hover:bg-primary-50/40">
          <input type="checkbox" name="acceptTerms" className="peer sr-only" aria-invalid={errors.fields.acceptTerms ? true : undefined} />
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-white transition peer-checked:border-primary-700 peer-checked:bg-primary-700 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2" aria-hidden="true">
            <Check size={14} strokeWidth={3} />
          </span>
          <span>
            <a href={ROUTES.agreements('hizmet-sozlesmesi')} target="_blank" className="font-semibold text-primary-700 underline-offset-2 hover:underline">
              Kullanım koşullarını
            </a>{' '}
            ve{' '}
            <a href={ROUTES.agreements('kvkk')} target="_blank" className="font-semibold text-primary-700 underline-offset-2 hover:underline">
              KVKK aydınlatma metnini
            </a>{' '}
            okudum, kabul ediyorum.
          </span>
        </label>
        {errors.fields.acceptTerms && (
          <p role="alert" className="ml-8 mt-1 text-xs font-semibold text-red-600">
            {errors.fields.acceptTerms}
          </p>
        )}
      </div>

      <Button type="submit" icon={ArrowRight} isLoading={pending} className="w-full shadow-lg shadow-primary-700/15">
        Ücretsiz hesabımı oluştur
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs font-medium text-gray-400"><ShieldCheck size={14} /> Kart bilgisi gerekmez.</p>
      <p className="text-center text-sm text-gray-600">
        Zaten hesabın var mı?{' '}
        <a href={`${ROUTES.login}${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="font-bold text-primary-600 hover:underline">
          Giriş yap
        </a>
      </p>
    </form>
  );
}
