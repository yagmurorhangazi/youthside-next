/**
 * [MODÜL: PROFİL BİLGİLERİ FORMU — REACT ISLAND]
 * Amaç: Adayın kişisel, eğitim ve bağlantı bilgilerini güncellemek (candidates/update).
 * E-posta değiştirilemez (API güvenlik nedeniyle engelliyor), salt okunur gösterilir.
 *
 * Kaydettikten sonra API'nin döndürdüğü yeni doluluk oranı gösterilir; kullanıcı bir ilandan
 * yönlendirildiyse ve profil yeterli hale geldiyse "İlana geri dön" düğmesi çıkar.
 */

import { useId, useState, type FormEvent } from 'react';
import { actions } from 'astro:actions';
import { ArrowRight, GraduationCap, Link2, Save, UserRound } from 'lucide-react';
import { useEducationOptions } from '@/features/lookups/useEducationOptions';
import { NO_ERRORS, toFormErrors, type FormErrorState } from '@/shared/lib/action-result';
import { Button, ButtonLink, FormAlert, FormField, Input, Select } from '@/shared/ui';
import { GENDERS, type CandidateProfile } from '../types';

interface ProfileDetailsFormProps {
  readonly profile: CandidateProfile;
  /** Başvuru akışından gelindiyse dönülecek ilan adresi. */
  readonly returnTo: string | null;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 16 }, (_, i) => String(CURRENT_YEAR + 6 - i));

function Section({ icon: Icon, title, children }: { icon: typeof UserRound; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <legend className="sr-only">{title}</legend>
      <h2 className="mb-5 flex items-center gap-2 font-bold text-gray-900" aria-hidden="true">
        <Icon size={18} className="text-primary-500" />
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export default function ProfileDetailsForm({ profile, returnTo }: ProfileDetailsFormProps) {
  const uid = useId();
  const education = useEducationOptions();
  const [errors, setErrors] = useState<FormErrorState>(NO_ERRORS);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ percentage: number; isEligible: boolean } | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '');

    setPending(true);
    setErrors(NO_ERRORS);
    setResult(null);
    const { data, error } = await actions.profile.update({
      firstName: text('firstName'),
      lastName: text('lastName'),
      phone: text('phone'),
      gender: text('gender'),
      university: text('university'),
      department: text('department'),
      grade: text('grade'),
      graduationYear: text('graduationYear'),
      linkedinUrl: text('linkedinUrl'),
      githubUrl: text('githubUrl'),
    });
    setPending(false);
    if (error) return setErrors(toFormErrors(error));
    setResult(data.completeness ? { percentage: data.completeness.percentage, isEligible: data.completeness.isEligible } : { percentage: 0, isEligible: false });
  };

  const id = (name: string) => `${uid}-${name}`;
  const err = (name: string) => errors.fields[name];

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Section icon={UserRound} title="Kişisel bilgiler">
        <FormField id={id('firstName')} label="Ad" required error={err('firstName')}>
          {(a11y) => <Input id={id('firstName')} name="firstName" defaultValue={profile.firstName} autoComplete="given-name" {...a11y} />}
        </FormField>
        <FormField id={id('lastName')} label="Soyad" required error={err('lastName')}>
          {(a11y) => <Input id={id('lastName')} name="lastName" defaultValue={profile.lastName} autoComplete="family-name" {...a11y} />}
        </FormField>
        <FormField id={id('email')} label="E-posta" hint="E-posta adresi buradan değiştirilemez.">
          {(a11y) => <Input id={id('email')} value={profile.email} readOnly className="cursor-not-allowed text-gray-500" {...a11y} />}
        </FormField>
        <FormField id={id('phone')} label="Telefon" error={err('phone')}>
          {(a11y) => <Input id={id('phone')} name="phone" type="tel" inputMode="tel" defaultValue={profile.phone ?? ''} autoComplete="tel" placeholder="05xx xxx xx xx" {...a11y} />}
        </FormField>
        <FormField id={id('gender')} label="Cinsiyet" error={err('gender')}>
          {(a11y) => (
            <Select
              id={id('gender')}
              name="gender"
              defaultValue={profile.gender ?? ''}
              options={[{ value: '', label: 'Seçiniz' }, ...GENDERS.map((gender) => ({ value: gender, label: gender }))]}
              {...a11y}
            />
          )}
        </FormField>
      </Section>

      <Section icon={GraduationCap} title="Eğitim bilgileri">
        <FormField id={id('university')} label="Üniversite" error={err('university')} className="sm:col-span-2">
          {(a11y) => <Input id={id('university')} name="university" list={`${uid}-universities`} defaultValue={profile.university ?? ''} {...a11y} />}
        </FormField>
        <FormField id={id('department')} label="Bölüm" error={err('department')} className="sm:col-span-2">
          {(a11y) => <Input id={id('department')} name="department" list={`${uid}-departments`} defaultValue={profile.department ?? ''} {...a11y} />}
        </FormField>
        <FormField id={id('grade')} label="Sınıf / durum" error={err('grade')}>
          {(a11y) => (
            <Select
              id={id('grade')}
              name="grade"
              defaultValue={profile.grade ?? ''}
              // Kayıtlı değer listede yoksa da seçili görünmesi için eklenir.
              options={[
                { value: '', label: 'Seçiniz' },
                ...[...new Set([...(profile.grade ? [profile.grade] : []), ...education.grades])].map((grade) => ({ value: grade, label: grade })),
              ]}
              {...a11y}
            />
          )}
        </FormField>
        <FormField id={id('graduationYear')} label="Mezuniyet yılı" error={err('graduationYear')}>
          {(a11y) => (
            <Select
              id={id('graduationYear')}
              name="graduationYear"
              defaultValue={profile.graduationYear ? String(profile.graduationYear) : ''}
              options={[{ value: '', label: 'Seçiniz' }, ...YEARS.map((year) => ({ value: year, label: year }))]}
              {...a11y}
            />
          )}
        </FormField>
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
      </Section>

      <Section icon={Link2} title="Bağlantılar">
        <FormField id={id('linkedinUrl')} label="LinkedIn" error={err('linkedinUrl')}>
          {(a11y) => <Input id={id('linkedinUrl')} name="linkedinUrl" type="url" inputMode="url" defaultValue={profile.linkedinUrl ?? ''} placeholder="https://linkedin.com/in/…" {...a11y} />}
        </FormField>
        <FormField id={id('githubUrl')} label="GitHub / Portfolyo" error={err('githubUrl')}>
          {(a11y) => <Input id={id('githubUrl')} name="githubUrl" type="url" inputMode="url" defaultValue={profile.githubUrl ?? ''} placeholder="https://github.com/…" {...a11y} />}
        </FormField>
      </Section>

      {errors.message && <FormAlert>{errors.message}</FormAlert>}
      {result && (
        <FormAlert variant="success" title="Profilin güncellendi">
          Profil doluluk oranın şu an <strong>%{result.percentage}</strong>.
          {returnTo && result.isEligible && (
            <ButtonLink href={returnTo} size="sm" icon={ArrowRight} className="mt-3">
              İlana geri dön ve başvur
            </ButtonLink>
          )}
        </FormAlert>
      )}

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" icon={Save} isLoading={pending} className="w-full shadow-xl sm:w-auto">
          Değişiklikleri kaydet
        </Button>
      </div>
    </form>
  );
}
