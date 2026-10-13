/**
 * [MODÜL: ÖN ELEME SORUSU ALANI]
 * Amaç: Şirketin ilana eklediği soruyu tipine göre doğru form kontrolüyle çizmek.
 *   text / video / file → tek satır (video/dosya için bağlantı istenir)
 *   long_text           → çok satırlı metin
 *   select              → açılır liste · radio → tekli seçim
 *   multiselect / checkbox → çoklu seçim (seçeneksiz checkbox → "Evet" onayı)
 * OCP: Yeni soru tipi gelirse yalnızca bu bileşene bir dal eklenir.
 */

import type { JobQuestion } from '../types';

export type Answer = string | string[];

interface QuestionFieldProps {
  readonly question: JobQuestion;
  readonly value: Answer;
  readonly onChange: (value: Answer) => void;
  readonly error?: string;
}

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 aria-[invalid=true]:border-red-300';

export function QuestionField({ question, value, onChange, error }: QuestionFieldProps) {
  const id = `q-${question.id}`;
  const errorId = error ? `${id}-error` : undefined;
  const text = typeof value === 'string' ? value : '';
  const list = Array.isArray(value) ? value : [];
  const a11y = { 'aria-invalid': error ? true : undefined, 'aria-describedby': errorId };

  const label = (
    <span className="mb-2 block text-sm font-semibold text-gray-800">
      {question.text}
      {question.isRequired && <span className="ml-0.5 text-primary-600" aria-hidden="true">*</span>}
    </span>
  );

  let control;
  const isMulti = question.type === 'multiselect' || question.type === 'checkbox';

  if (isMulti && question.options.length === 0) {
    control = (
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 text-sm">
        <input type="checkbox" checked={text === 'Evet'} onChange={(event) => onChange(event.target.checked ? 'Evet' : '')} className="h-5 w-5 accent-primary-600" />
        Evet
      </label>
    );
  } else if (isMulti || question.type === 'radio') {
    const multiple = isMulti;
    control = (
      <div role={multiple ? 'group' : 'radiogroup'} aria-labelledby={`${id}-label`} className="grid gap-2 sm:grid-cols-2" {...a11y}>
        {question.options.map((option) => {
          const checked = multiple ? list.includes(option) : text === option;
          return (
            <label
              key={option}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 text-sm transition ${
                checked ? 'border-primary-300 bg-primary-50 font-semibold text-primary-800' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={id}
                checked={checked}
                onChange={() => onChange(multiple ? (checked ? list.filter((item) => item !== option) : [...list, option]) : option)}
                className="h-4 w-4 accent-primary-600"
              />
              {option}
            </label>
          );
        })}
      </div>
    );
  } else if (question.type === 'select') {
    control = (
      <select id={id} value={text} onChange={(event) => onChange(event.target.value)} className={inputClass} {...a11y}>
        <option value="">Seçiniz</option>
        {question.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  } else if (question.type === 'long_text') {
    control = <textarea id={id} rows={4} maxLength={5000} value={text} onChange={(event) => onChange(event.target.value)} className={inputClass} {...a11y} />;
  } else {
    const isLink = question.type === 'video' || question.type === 'file';
    control = (
      <input
        id={id}
        type={isLink ? 'url' : 'text'}
        inputMode={isLink ? 'url' : undefined}
        placeholder={isLink ? 'https:// (Google Drive, YouTube vb. bağlantı)' : undefined}
        maxLength={5000}
        value={text}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
        {...a11y}
      />
    );
  }

  const usesLabelElement = !isMulti && question.type !== 'radio';
  return (
    <div>
      {usesLabelElement ? <label htmlFor={id}>{label}</label> : <span id={`${id}-label`}>{label}</span>}
      {control}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** Zorunlu soru yanıtlandı mı? */
export function isAnswered(value: Answer | undefined): boolean {
  return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim());
}
