/**
 * [MODÜL: ORTAK DOĞRULAMA ŞEMALARI]
 * Amaç: Birden fazla action'da kullanılan alan kurallarını (e-posta, şifre, telefon, kimlik)
 *       tek yerde tanımlamak. Kural değişirse tüm formlar birlikte güncellenir (DRY).
 */

import { z } from 'astro/zod';
import { EMAIL_MESSAGES, hasNonAsciiCharacters } from '@/shared/lib/email';

/** Türkçe karakterli adreste genel "geçersiz" yerine nedeni söylenir (bkz. shared/lib/email). */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => !hasNonAsciiCharacters(value), { error: EMAIL_MESSAGES.nonAscii, abort: true })
  .pipe(z.email({ error: EMAIL_MESSAGES.invalid }).max(255));

/** API en az 8 karakter istiyor (auth/reset-password). */
export const passwordSchema = z.string().min(8, 'Şifre en az 8 karakter olmalı.').max(128);

/** Boş bırakılabilir; doluysa en az 10 rakam/işaret. API E.164'e kendisi normalize eder. */
export const phoneSchema = z
  .string()
  .trim()
  .max(50)
  .regex(/^$|^[+\d\s()-]{10,}$/, 'Geçerli bir telefon numarası gir.');

export const nameSchema = (label: string) => z.string().trim().min(2, `${label} en az 2 karakter olmalı.`).max(100);

export const idSchema = z.string().trim().min(8).max(64);
