/**
 * [MODÜL: BAŞVURU VE ETKİNLİK KAYDI ACTION'LARI]
 * Amaç: İlana başvuru, etkinliğe kayıt (giriş yapmış/misafir) işlemleri.
 *
 * Beklenen iş kuralı hataları (profil eksik, sözleşme onayı eksik, zaten başvurulmuş) ActionError
 * yerine yapılandırılmış sonuç olarak döner; arayüz her duruma özel ekran gösterebilsin.
 * Referans: api-docs-v2 → applications/create, registrations/create, registrations/quick-register
 */

import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { ApiError } from '@/shared/api/errors';
import { records, str } from '@/shared/api/parse';
import { requireUser, toActionError } from './errors';
import { emailSchema, idSchema, nameSchema, phoneSchema } from './schemas';

const uuid = idSchema;
const contractIds = z.array(uuid).max(20).default([]);

/** API'nin 403/409/422 yanıtlarını arayüzün anlayacağı sonuçlara çevirir. */
function toBusinessOutcome(error: unknown) {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 409) return { status: 'already_done' as const, message: error.message };
  if (error.status === 403 && Array.isArray(error.payload.missing_fields)) {
    return {
      status: 'profile_incomplete' as const,
      message: error.message,
      missingFields: records(error.payload.missing_fields).map((item) => str(item.label) ?? str(item.field) ?? ''),
    };
  }
  if (error.status === 422 && Array.isArray(error.payload.contracts)) {
    return { status: 'contracts_required' as const, message: error.message };
  }
  if (error.status === 422 && Array.isArray(error.payload.questions)) {
    return { status: 'questions_required' as const, message: error.message };
  }
  return null;
}

export const participation = {
  apply: defineAction({
    input: z.object({
      jobId: uuid,
      coverLetter: z.string().trim().max(5000).optional(),
      acceptedContracts: contractIds,
      answers: z
        .array(z.object({ questionId: uuid, answer: z.union([z.string().trim().max(5000), z.array(z.string().max(500)).max(50)]) }))
        .max(50)
        .default([]),
    }),
    handler: async (input, context) => {
      requireUser(context.locals.user);
      try {
        await context.locals.services.candidate.apply(input);
        return { status: 'ok' as const };
      } catch (error) {
        const outcome = toBusinessOutcome(error);
        if (outcome) return outcome;
        throw toActionError(error);
      }
    },
  }),

  registerEvent: defineAction({
    input: z.object({ eventId: uuid, acceptedContracts: contractIds }),
    handler: async (input, context) => {
      requireUser(context.locals.user);
      try {
        await context.locals.services.candidate.registerEvent(input.eventId, input.acceptedContracts);
        return { status: 'ok' as const };
      } catch (error) {
        const outcome = toBusinessOutcome(error);
        if (outcome) return outcome;
        throw toActionError(error);
      }
    },
  }),

  /** Hesapsız hızlı kayıt — API e-postaya göre hesap oluşturur veya mevcut hesaba bağlar. */
  quickRegister: defineAction({
    input: z.object({
      eventId: uuid,
      firstName: nameSchema('Ad'),
      lastName: nameSchema('Soyad'),
      email: emailSchema,
      phone: phoneSchema.optional(),
      university: z.string().trim().max(255).optional(),
      department: z.string().trim().max(255).optional(),
      grade: z.string().trim().max(50).optional(),
      acceptedContracts: contractIds,
      honeypot: z.string().max(200).optional(),
    }),
    handler: async (input, context) => {
      try {
        const result = await context.locals.services.candidate.quickRegister(input);
        return { status: 'ok' as const, isNewAccount: result.isNewAccount };
      } catch (error) {
        const outcome = toBusinessOutcome(error);
        if (outcome) return outcome;
        throw toActionError(error);
      }
    },
  }),
};
