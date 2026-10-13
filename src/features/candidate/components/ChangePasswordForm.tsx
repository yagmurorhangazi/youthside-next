/**
 * [MODÜL: ŞİFRE DEĞİŞTİRME FORMU — REACT ISLAND]
 * Amaç: Giriş yapmış adayın mevcut şifresini doğrulayarak yeni şifre belirlemesi (auth/update-password).
 */

import { useId, useState, type FormEvent } from 'react';
import { actions } from 'astro:actions';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { NO_ERRORS, toFormErrors, type FormErrorState } from '@/shared/lib/action-result';
import { Button, FormAlert, FormField, PasswordInput } from '@/shared/ui';

export default function ChangePasswordForm() {
  const uid = useId();
  const [errors, setErrors] = useState<FormErrorState>(NO_ERRORS);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    setErrors(NO_ERRORS);
    setDone(false);
    const { error } = await actions.auth.updatePassword({
      currentPassword: String(form.get('currentPassword') ?? ''),
      newPassword: String(form.get('newPassword') ?? ''),
      newPasswordConfirm: String(form.get('newPasswordConfirm') ?? ''),
    });
    setPending(false);
    if (error) return setErrors(toFormErrors(error));
    formElement.reset();
    setDone(true);
  };

  const id = (name: string) => `${uid}-${name}`;

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-[20px] border border-slate-200/70 bg-white p-5 shadow-card sm:p-6">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <KeyRound size={18} aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-semibold text-slate-950">Hesap güvenliği</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs leading-5 text-slate-400"><ShieldCheck size={13} aria-hidden="true" /> Güçlü ve benzersiz bir şifre kullanmanı öneririz.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <FormField id={id('current')} label="Mevcut şifre" error={errors.fields.currentPassword}>
          {(a11y) => <PasswordInput id={id('current')} name="currentPassword" autoComplete="current-password" {...a11y} />}
        </FormField>
        <FormField id={id('new')} label="Yeni şifre" error={errors.fields.newPassword}>
          {(a11y) => <PasswordInput id={id('new')} name="newPassword" autoComplete="new-password" {...a11y} />}
        </FormField>
        <FormField id={id('confirm')} label="Yeni şifre (tekrar)" error={errors.fields.newPasswordConfirm}>
          {(a11y) => <PasswordInput id={id('confirm')} name="newPasswordConfirm" autoComplete="new-password" {...a11y} />}
        </FormField>
      </div>
      {errors.message && <FormAlert className="mt-4">{errors.message}</FormAlert>}
      {done && <FormAlert variant="success" className="mt-4">Şifren güncellendi.</FormAlert>}
      <div className="mt-5 flex justify-end">
        <Button type="submit" variant="secondary" isLoading={pending} className="w-full rounded-2xl sm:w-auto">
          Şifreyi güncelle
        </Button>
      </div>
    </form>
  );
}
