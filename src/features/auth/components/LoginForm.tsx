/**
 * [MODÜL: GİRİŞ FORMU — REACT ISLAND]
 * Amaç: Aday girişini yönetmek. Akış:
 *   1. E-posta + şifre → başarılıysa `redirect` adresine gidilir
 *   2. Hesapta 2FA açıksa aynı form 6 haneli kod adımına geçer
 *   3. E-posta doğrulanmamışsa doğrulama e-postasını yeniden gönderme seçeneği sunulur
 * Token'lar sunucu oturumunda kalır; bu bileşen yalnızca sonucu yorumlar.
 */

import { useId, useState, type FormEvent } from 'react';
import { actions } from 'astro:actions';
import { Mail, ShieldCheck } from 'lucide-react';
import { ROUTES } from '@/config/site';
import { NO_ERRORS, toFormErrors, type FormErrorState } from '@/shared/lib/action-result';
import { Button, FormAlert, FormField, Input, PasswordInput } from '@/shared/ui';

interface LoginFormProps {
  readonly redirect: string;
  /** Kayıt sonrası yönlendirmede e-posta önceden doldurulur. */
  readonly initialEmail?: string;
  /** Kayıt veya şifre sıfırlama sonrası gösterilecek bilgi mesajı. */
  readonly notice?: string;
}

type Step = 'credentials' | 'otp';

export default function LoginForm({ redirect, initialEmail = '', notice }: LoginFormProps) {
  const uid = useId();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [errors, setErrors] = useState<FormErrorState>(NO_ERRORS);
  const [unverified, setUnverified] = useState(false);
  const [info, setInfo] = useState<string | null>(notice ?? null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setErrors(NO_ERRORS);
    setUnverified(false);
    setInfo(null);

    const { data, error } = await actions.auth.login({
      email,
      password,
      otpCode: step === 'otp' ? otpCode : undefined,
      redirect,
    });

    if (error) {
      setPending(false);
      return setErrors(toFormErrors(error));
    }
    if (data.status === 'ok') {
      // Tam sayfa geçişi: header ve tüm sayfa yeni oturumla sunucuda yeniden çizilir.
      window.location.assign(data.redirect);
      return;
    }
    setPending(false);
    if (data.status === 'otp_required') return setStep('otp');
    if (data.status === 'unverified') setUnverified(true);
  };

  const resend = async () => {
    setPending(true);
    const { error } = await actions.auth.resendVerification({ email });
    setPending(false);
    if (error) return setErrors(toFormErrors(error));
    setUnverified(false);
    setInfo('Doğrulama bağlantısı e-posta adresine tekrar gönderildi. Spam klasörünü de kontrol etmeyi unutma.');
  };

  const id = (name: string) => `${uid}-${name}`;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {info && <FormAlert variant="success">{info}</FormAlert>}
      {errors.message && <FormAlert>{errors.message}</FormAlert>}
      {unverified && (
        <FormAlert variant="warning" title="E-posta adresin henüz doğrulanmamış">
          <p>Hesabını etkinleştirmek için e-postandaki bağlantıya tıkla.</p>
          <button type="button" onClick={resend} disabled={pending} className="mt-2 font-bold underline underline-offset-2">
            Doğrulama e-postasını tekrar gönder
          </button>
        </FormAlert>
      )}

      {step === 'credentials' ? (
        <>
          <FormField id={id('email')} label="E-posta" error={errors.fields.email}>
            {(a11y) => (
              <Input
                id={id('email')}
                type="email"
                inputMode="email"
                autoComplete="email"
                icon={Mail}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus={!initialEmail}
                {...a11y}
              />
            )}
          </FormField>
          <FormField id={id('password')} label="Şifre" error={errors.fields.password}>
            {(a11y) => (
              <PasswordInput
                id={id('password')}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoFocus={Boolean(initialEmail)}
                {...a11y}
              />
            )}
          </FormField>
          <div className="flex justify-end">
            <a href={ROUTES.forgotPassword} className="text-sm font-semibold text-primary-600 hover:underline">
              Şifremi unuttum
            </a>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start gap-3 rounded-2xl bg-primary-50 p-4 text-sm text-primary-900">
            <ShieldCheck size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            Hesabında iki adımlı doğrulama açık. Doğrulama uygulamandaki 6 haneli kodu gir.
          </div>
          <FormField id={id('otp')} label="Doğrulama kodu" error={errors.fields.otpCode}>
            {(a11y) => (
              <Input
                id={id('otp')}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ''))}
                className="text-center text-lg tracking-[0.5em]"
                autoFocus
                {...a11y}
              />
            )}
          </FormField>
          <button type="button" onClick={() => setStep('credentials')} className="text-sm font-semibold text-gray-500 hover:text-gray-800">
            ← Farklı hesapla giriş yap
          </button>
        </>
      )}

      <Button type="submit" isLoading={pending} className="w-full">
        {step === 'otp' ? 'Doğrula ve giriş yap' : 'Giriş yap'}
      </Button>

      <p className="text-center text-sm text-gray-600">
        Hesabın yok mu?{' '}
        <a href={`${ROUTES.register}${redirect !== ROUTES.dashboard ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="font-bold text-primary-600 hover:underline">
          Ücretsiz kayıt ol
        </a>
      </p>
    </form>
  );
}
