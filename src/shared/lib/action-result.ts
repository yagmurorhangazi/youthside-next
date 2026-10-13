/**
 * [MODÜL: ACTION SONUÇ YARDIMCILARI — İSTEMCİ]
 * Amaç: Action hatalarını formlarda gösterilecek biçime çevirmek.
 *   - Zod doğrulama hatası → alan bazlı mesajlar ({ email: 'Geçerli bir e-posta...' })
 *   - Diğer hatalar         → tek genel mesaj
 * Her form aynı dönüşümü tekrar yazmaz (DRY).
 */

import { isInputError, type ActionError } from 'astro:actions';

export type FieldErrors = Record<string, string>;

export interface FormErrorState {
  readonly fields: FieldErrors;
  readonly message: string | null;
}

export const NO_ERRORS: FormErrorState = { fields: {}, message: null };

export function toFormErrors(error: ActionError | undefined): FormErrorState {
  if (!error) return NO_ERRORS;
  if (isInputError(error)) {
    const fields: FieldErrors = {};
    for (const [key, messages] of Object.entries(error.fields)) {
      if (Array.isArray(messages) && messages[0]) fields[key] = String(messages[0]);
    }
    return { fields, message: Object.keys(fields).length ? null : 'Lütfen bilgileri kontrol et.' };
  }
  return { fields: {}, message: error.message || 'Bir şeyler ters gitti. Lütfen tekrar dene.' };
}
