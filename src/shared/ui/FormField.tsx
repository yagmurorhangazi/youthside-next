/**
 * [MODÜL: FORM ALANI — UI KIT GENİŞLETMESİ]
 * Amaç: Kit'teki Input/Select/Textarea'yı erişilebilir etiket, ipucu ve hata mesajıyla sarmak.
 * Neden: Kit bileşenlerinin `label`'ı input'a bağlı değil (htmlFor yok) ve hata metni ekran
 *        okuyucuya duyurulmuyor. Bu sarmalayıcı `id`, `aria-describedby` ilişkisini kurar.
 *
 * Kullanım:
 *   <FormField id="email" label="E-posta" error={errors.email} required>
 *     {(a11y) => <Input id="email" {...a11y} />}
 *   </FormField>
 */

import type { ReactNode } from 'react';

export interface FieldA11yProps {
  readonly 'aria-invalid'?: boolean;
  readonly 'aria-describedby'?: string;
}

interface FormFieldProps {
  readonly id: string;
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  readonly error?: string | null;
  readonly required?: boolean;
  readonly className?: string;
  readonly children: (a11y: FieldA11yProps) => ReactNode;
}

export function FormField({ id, label, hint, error, required, className = '', children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="ml-1 block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-primary-600" aria-hidden="true">*</span>}
      </label>
      {children({ 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="ml-1 text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="ml-1 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
