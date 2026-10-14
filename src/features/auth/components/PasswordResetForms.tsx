/**
 * [MODÜL: ŞİFRE SIFIRLAMA FORMLARI — REACT ISLAND]
 * Amaç: "Şifremi unuttum" (bağlantı isteme) ve "Şifre sıfırla" (yeni şifre belirleme) adımları.
 * İki form aynı dosyada: aynı akışın parçaları ve ortak yardımcıları paylaşıyorlar.
 *
 * Güvenlik: "Şifremi unuttum" her durumda aynı mesajı gösterir; e-postanın kayıtlı olup
 * olmadığı açığa çıkmaz (hesap avlamayı zorlaştırır).
 */

import { useId, useState, type FormEvent } from 'react';
import { actions } from 'astro:actions';
import { Mail, MailCheck } from '@/shared/ui';
import { ROUTES } from '@/config/site';
import { NO_ERRORS, toFormErrors, type FormErrorState } from '@/shared/lib/action-result';
import { Button, ButtonLink, FormAlert, FormField, Input, PasswordInput } from '@/shared/ui';

export function ForgotPasswordForm() {
  const uid = useId();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FormErrorState>(NO_ERRORS);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setErrors(NO_ERRORS);
    const { data, error } = await actions.auth.forgotPassword({ email });
    setPending(false);
    if (error) return setErrors(toFormErrors(error));
    setSentTo(data.email);
  };

  if (sentTo) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <MailCheck size={32} aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">E-postanı kontrol et</h2>
        <p className="mt-3 text-sm text-gray-600">
          <strong className="text-gray-900">{sentTo}</strong> adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi. Bağlantı 1 saat geçerlidir.
        </p>
        <ButtonLink href={ROUTES.login} variant="secondary" className="mt-6 w-full">
          Giriş sayfasına dön
        </ButtonLink>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {errors.message && <FormAlert>{errors.message}</FormAlert>}
      <FormField id={`${uid}-email`} label="E-posta" error={errors.fields.email}>
        {(a11y) => (
          <Input
            id={`${uid}-email`}
            type="email"
            inputMode="email"
            autoComplete="email"
            icon={Mail}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoFocus
            {...a11y}
          />
        )}
      </FormField>
      <Button type="submit" isLoading={pending} className="w-full">
        Sıfırlama bağlantısı gönder
      </Button>
      <p className="text-center text-sm">
        <a href={ROUTES.login} className="font-semibold text-gray-600 hover:text-primary-600">
          ← Giriş sayfasına dön
        </a>
      </p>
    </form>
  );
}

interface ResetPasswordFormProps {
  readonly token: string;
  readonly email: string;
}

export function ResetPasswordForm({ token, email }: ResetPasswordFormProps) {
  const uid = useId();
  const [errors, setErrors] = useState<FormErrorState>(NO_ERRORS);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setErrors(NO_ERRORS);
    const { error } = await actions.auth.resetPassword({
      token,
      password: String(form.get('password') ?? ''),
      passwordConfirm: String(form.get('passwordConfirm') ?? ''),
    });
    if (error) {
      setPending(false);
      return setErrors(toFormErrors(error));
    }
    window.location.assign(`${ROUTES.login}?email=${encodeURIComponent(email)}&sifirlandi=1`);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {errors.message && <FormAlert>{errors.message}</FormAlert>}
      {/* Tarayıcı şifre yöneticisinin doğru hesabı eşleştirmesi için gizli kullanıcı adı alanı */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <FormField id={`${uid}-password`} label="Yeni şifre" hint="En az 8 karakter" error={errors.fields.password}>
        {(a11y) => <PasswordInput id={`${uid}-password`} name="password" autoComplete="new-password" required autoFocus {...a11y} />}
      </FormField>
      <FormField id={`${uid}-confirm`} label="Yeni şifre (tekrar)" error={errors.fields.passwordConfirm}>
        {(a11y) => <PasswordInput id={`${uid}-confirm`} name="passwordConfirm" autoComplete="new-password" required {...a11y} />}
      </FormField>
      <Button type="submit" isLoading={pending} className="w-full">
        Şifremi güncelle
      </Button>
    </form>
  );
}
