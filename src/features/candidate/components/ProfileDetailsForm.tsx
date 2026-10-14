/**
 * [MODÜL: PROFİL BİLGİLERİ FORMU — REACT ISLAND]
 * Amaç: Adayın kişisel, eğitim ve bağlantı bilgilerini güncellemek (candidates/update).
 * E-posta değiştirilemez (API güvenlik nedeniyle engelliyor), salt okunur gösterilir.
 *
 * Kaydettikten sonra API'nin döndürdüğü yeni doluluk oranı gösterilir; kullanıcı bir ilandan
 * yönlendirildiyse ve profil yeterli hale geldiyse "İlana geri dön" düğmesi çıkar.
 *
 * Otomatik CV: Sunucu "üretilmeli" derse (CV yok veya önceki CV otomatikti) PDF tarayıcıda üretilip
 * yüklenir. Son doluluk `$completeness` ile yayınlanır; bekleyen başvuru varsa popup hemen açılır.
 * Referans: youthside-2026-ui/panelim/profilim → submitProfile + generateAutoCV(true)
 */

import { useId, useState, type FormEvent } from 'react';
import { actions } from 'astro:actions';
import { ArrowRight, GraduationCap, Link2, Save, UserRound } from 'lucide-react';
import { useEducationOptions } from '@/features/lookups/useEducationOptions';
import { NO_ERRORS, toFormErrors, type FormErrorState } from '@/shared/lib/action-result';
import { capitalizePersonName } from '@/shared/lib/text';
import { Button, ButtonLink, FormAlert, FormField, Input, NameInput, Select } from '@/shared/ui';
import { generateAndUploadResume } from '../generate-resume';
import { $completeness, $resumeData, $resumeUrl } from '../store';
import { GENDERS, type CandidateProfile, type ResumeData } from '../types';

interface ProfileDetailsFormProps {
  readonly profile: CandidateProfile;
  /** Başvuru akışından gelindiyse dönülecek ilan adresi. */
  readonly returnTo: string | null;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 16 }, (_, i) => String(CURRENT_YEAR + 6 - i));

function Section({ icon: Icon, title, description, children }: { icon: typeof UserRound; title: string; description: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-slate-100 p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <div className="mb-6 flex items-start gap-3" aria-hidden="true">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center text-primary-600">
          <Icon size={18} />
        </span>
        <div>
          <h2 className="font-semibold text-slate-950">{title}</h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-400">{description}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export default function ProfileDetailsForm({ profile, returnTo }: ProfileDetailsFormProps) {
  const uid = useId();
  const education = useEducationOptions();
  const [errors, setErrors] = useState<FormErrorState>(NO_ERRORS);
  const [pending, setPending] = useState(false);
  const [resumeStep, setResumeStep] = useState<'idle' | 'generating' | 'generated' | 'failed'>('idle');
  const [result, setResult] = useState<{ percentage: number; isEligible: boolean } | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '');

    const input = {
      firstName: capitalizePersonName(text('firstName')),
      lastName: capitalizePersonName(text('lastName')),
      phone: text('phone'),
      gender: text('gender'),
      university: text('university'),
      department: text('department'),
      grade: text('grade'),
      graduationYear: text('graduationYear'),
      linkedinUrl: text('linkedinUrl'),
      githubUrl: text('githubUrl'),
    };

    setPending(true);
    setErrors(NO_ERRORS);
    setResult(null);
    setResumeStep('idle');
    const { data, error } = await actions.profile.update(input);
    if (error) {
      setPending(false);
      return setErrors(toFormErrors(error));
    }

    const resumeData: ResumeData = {
      fullName: `${input.firstName} ${input.lastName}`.trim(),
      email: profile.email,
      phone: input.phone || null,
      university: input.university || null,
      department: input.department || null,
      grade: input.grade || null,
      graduationYear: input.graduationYear || null,
      linkedinUrl: input.linkedinUrl || null,
      githubUrl: input.githubUrl || null,
    };
    $resumeData.set(resumeData);

    let completeness = data.completeness;
    if (data.shouldGenerateResume) {
      setResumeStep('generating');
      const generated = await generateAndUploadResume(resumeData);
      if (generated.ok) {
        setResumeStep('generated');
        $resumeUrl.set(generated.resumeUrl);
        completeness = generated.completeness ?? completeness;
      } else {
        setResumeStep('failed');
      }
    }
    setPending(false);

    const next = completeness ? { percentage: completeness.percentage, isEligible: completeness.isEligible } : { percentage: 0, isEligible: false };
    setResult(next);
    // CV adımı bittikten sonra yayınlanır: popup eski CV ile başvuru göndermesin.
    if (completeness) $completeness.set(next);
  };

  const id = (name: string) => `${uid}-${name}`;
  const err = (name: string) => errors.fields[name];

  return (
    <form onSubmit={onSubmit} noValidate className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white shadow-card">
      <Section icon={UserRound} title="Kişisel bilgiler" description="İletişim ve temel kimlik bilgilerini güncel tut.">
        <FormField id={id('firstName')} label="Ad" required error={err('firstName')}>
          {(a11y) => <NameInput id={id('firstName')} name="firstName" defaultValue={profile.firstName} autoComplete="given-name" {...a11y} />}
        </FormField>
        <FormField id={id('lastName')} label="Soyad" required error={err('lastName')}>
          {(a11y) => <NameInput id={id('lastName')} name="lastName" defaultValue={profile.lastName} autoComplete="family-name" {...a11y} />}
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

      <Section icon={GraduationCap} title="Eğitim bilgileri" description="Sana uygun fırsatların eşleşmesi için eğitim durumunu ekle.">
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

      <Section icon={Link2} title="Profesyonel bağlantılar" description="İşverenlerin çalışmalarını ve deneyimini daha yakından görmesini sağla.">
        <FormField id={id('linkedinUrl')} label="LinkedIn" error={err('linkedinUrl')}>
          {(a11y) => <Input id={id('linkedinUrl')} name="linkedinUrl" type="url" inputMode="url" defaultValue={profile.linkedinUrl ?? ''} placeholder="https://linkedin.com/in/…" {...a11y} />}
        </FormField>
        <FormField id={id('githubUrl')} label="GitHub / Portfolyo" error={err('githubUrl')}>
          {(a11y) => <Input id={id('githubUrl')} name="githubUrl" type="url" inputMode="url" defaultValue={profile.githubUrl ?? ''} placeholder="https://github.com/…" {...a11y} />}
        </FormField>
      </Section>

      {errors.message && <div className="px-5 pt-5 sm:px-6"><FormAlert>{errors.message}</FormAlert></div>}
      {resumeStep === 'failed' && (
        <div className="px-5 pt-5 sm:px-6">
          <FormAlert variant="warning">CV otomatik oluşturulamadı. Başvuru yapabilmek için yukarıdan CV dosyanı yükleyebilirsin.</FormAlert>
        </div>
      )}
      {result && (
        <div className="px-5 pt-5 sm:px-6">
          <FormAlert variant="success" title="Profilin güncellendi">
            Profil doluluk oranın şu an <strong>%{result.percentage}</strong>.
            {resumeStep === 'generated' && <span className="mt-1 block">CV’n profil bilgilerinden otomatik oluşturuldu ve profiline eklendi.</span>}
            {returnTo && result.isEligible && (
              <ButtonLink href={returnTo} size="sm" icon={ArrowRight} className="mt-3">
                İlana geri dön ve başvur
              </ButtonLink>
            )}
          </FormAlert>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 bg-slate-50/70 p-4 sm:px-6">
        <p className="hidden text-xs text-slate-500 sm:block">Değişikliklerini kaydederek profilini güncel tut.</p>
        <Button type="submit" icon={Save} isLoading={pending} className="w-full sm:w-auto">
          {resumeStep === 'generating' ? 'CV oluşturuluyor…' : 'Değişiklikleri kaydet'}
        </Button>
      </div>
    </form>
  );
}
