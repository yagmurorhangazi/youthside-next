/**
 * [MODÜL: HESAPSIZ HIZLI KAYIT FORMU]
 * Amaç: Giriş yapmamış kullanıcının tek formla etkinliğe kaydolabilmesi.
 * API e-postaya göre hesap oluşturur veya mevcut hesaba bağlar (registrations/quick-register).
 *
 * Eğitim seçenekleri (üniversite, bölüm, sınıf) form açılınca bir kez istenir; uzun listeler
 * yerel arama yapılabilen `datalist` ile sunulur (serbest yazıma da izin verir).
 * Bot koruması: ekranda görünmeyen `website` alanı (honeypot) API'ye iletilir.
 */

import { useId, useState, type FormEvent } from 'react';
import { actions } from 'astro:actions';
import { AlertCircle } from 'lucide-react';
import { ROUTES } from '@/config/site';
import { allRequiredAccepted, ContractChecklist } from '@/features/common/components/ContractChecklist';
import type { Contract } from '@/features/common/types';
import { NO_ERRORS, toFormErrors, type FormErrorState } from '@/shared/lib/action-result';
import { useEducationOptions } from '@/features/lookups/useEducationOptions';
import { Button, FormField, Input, Select } from '@/shared/ui';

interface QuickRegisterFormProps {
  readonly eventId: string;
  readonly contracts: readonly Contract[];
  readonly onSuccess: (isNewAccount: boolean) => void;
  readonly onAlreadyRegistered: () => void;
}

export function QuickRegisterForm({ eventId, contracts, onSuccess, onAlreadyRegistered }: QuickRegisterFormProps) {
  const uid = useId();
  const education = useEducationOptions();
  const [accepted, setAccepted] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrorState>(NO_ERRORS);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!allRequiredAccepted(contracts, accepted)) {
      setErrors({ fields: {}, message: 'Kayıt için zorunlu sözleşmeleri onaylaman gerekiyor.' });
      return;
    }
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '').trim();

    setPending(true);
    setErrors(NO_ERRORS);
    const { data, error } = await actions.participation.quickRegister({
      eventId,
      firstName: text('firstName'),
      lastName: text('lastName'),
      email: text('email'),
      phone: text('phone'),
      university: text('university'),
      department: text('department'),
      grade: text('grade'),
      acceptedContracts: accepted,
      honeypot: text('website'),
    });
    setPending(false);

    if (error) return setErrors(toFormErrors(error));
    if (data.status === 'ok') return onSuccess(data.isNewAccount);
    if (data.status === 'already_done') return onAlreadyRegistered();
    setErrors({ fields: {}, message: data.message });
  };

  const field = (name: string) => `${uid}-${name}`;
  const err = (name: string) => errors.fields[name];

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={field('firstName')} label="Ad" required error={err('firstName')}>
          {(a11y) => <Input id={field('firstName')} name="firstName" autoComplete="given-name" required {...a11y} />}
        </FormField>
        <FormField id={field('lastName')} label="Soyad" required error={err('lastName')}>
          {(a11y) => <Input id={field('lastName')} name="lastName" autoComplete="family-name" required {...a11y} />}
        </FormField>
      </div>
      <FormField id={field('email')} label="E-posta" required error={err('email')}>
        {(a11y) => <Input id={field('email')} name="email" type="email" inputMode="email" autoComplete="email" required {...a11y} />}
      </FormField>
      <FormField id={field('phone')} label="Telefon" error={err('phone')}>
        {(a11y) => <Input id={field('phone')} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" {...a11y} />}
      </FormField>
      <FormField id={field('university')} label="Üniversite" error={err('university')}>
        {(a11y) => <Input id={field('university')} name="university" list={`${uid}-universities`} autoComplete="organization" {...a11y} />}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={field('department')} label="Bölüm" error={err('department')}>
          {(a11y) => <Input id={field('department')} name="department" list={`${uid}-departments`} {...a11y} />}
        </FormField>
        <FormField id={field('grade')} label="Sınıf" error={err('grade')}>
          {(a11y) => (
            <Select
              id={field('grade')}
              name="grade"
              defaultValue=""
              options={[{ value: '', label: 'Seçiniz' }, ...education.grades.map((grade) => ({ value: grade, label: grade }))]}
              {...a11y}
            />
          )}
        </FormField>
      </div>
      <datalist id={`${uid}-universities`}>
        {education.universities.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id={`${uid}-departments`}>
        {education.departments.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>

      {/* Bot tuzağı: ekran okuyuculardan ve klavyeden gizli */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Web sitesi
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <ContractChecklist contracts={contracts} accepted={accepted} onChange={setAccepted} showErrors={submitted} />

      {errors.message && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          {errors.message}
        </p>
      )}

      <Button type="submit" isLoading={pending} className="w-full">
        Kaydımı tamamla
      </Button>
      <p className="text-center text-xs text-gray-500">
        Kaydolarak{' '}
        <a href={ROUTES.agreements('hizmet-sozlesmesi')} target="_blank" className="font-semibold underline">
          kullanım koşullarını
        </a>{' '}
        kabul etmiş olursun.
      </p>
    </form>
  );
}
