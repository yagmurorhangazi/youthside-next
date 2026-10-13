/**
 * [MODÜL: PROFİL ACTION'LARI]
 * Amaç: Adayın profil bilgilerini, fotoğrafını ve CV'sini güncellemek.
 * Dosya yüklemeleri `accept: 'form'` ile multipart alınır, boyut/tür sunucuda da doğrulanır
 * (istemci kontrolü atlanabilir; asıl güvenlik sunucudadır).
 */

import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { updateSessionUser } from '@/features/auth/session-store';
import { requireUser, run } from './errors';
import { nameSchema, phoneSchema } from './schemas';

const MB = 1024 * 1024;
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function assertFile(file: File, types: string[], maxBytes: number, label: string) {
  if (!types.includes(file.type)) throw new ActionError({ code: 'BAD_REQUEST', message: `${label} için desteklenmeyen dosya türü.` });
  if (file.size > maxBytes) throw new ActionError({ code: 'CONTENT_TOO_LARGE', message: `${label} en fazla ${maxBytes / MB} MB olabilir.` });
}

const optionalText = (max: number) => z.string().trim().max(max).default('');
const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((value) => value === '' || /^https?:\/\/\S+\.\S+/i.test(value), 'Bağlantı http(s):// ile başlamalı.')
  .default('');

export const profile = {
  update: defineAction({
    input: z.object({
      firstName: nameSchema('Ad'),
      lastName: nameSchema('Soyad'),
      phone: phoneSchema.default(''),
      gender: optionalText(30),
      university: optionalText(255),
      department: optionalText(255),
      grade: optionalText(50),
      graduationYear: z
        .string()
        .trim()
        .regex(/^$|^(19[5-9]\d|20\d{2})$/, 'Geçerli bir yıl gir.')
        .default(''),
      linkedinUrl: optionalUrl,
      githubUrl: optionalUrl,
    }),
    handler: (input, context) => {
      requireUser(context.locals.user);
      return run(async () => {
        const completeness = await context.locals.services.candidate.updateProfile(input);
        await updateSessionUser(context.session, { name: `${input.firstName} ${input.lastName}`.trim() });
        return { completeness };
      });
    },
  }),

  uploadAvatar: defineAction({
    accept: 'form',
    input: z.object({ file: z.instanceof(File) }),
    handler: (input, context) => {
      requireUser(context.locals.user);
      assertFile(input.file, AVATAR_TYPES, 5 * MB, 'Profil fotoğrafı');
      return run(async () => {
        const avatarUrl = await context.locals.services.candidate.uploadAvatar(input.file);
        await updateSessionUser(context.session, { avatarUrl });
        return { avatarUrl };
      });
    },
  }),

  uploadResume: defineAction({
    accept: 'form',
    input: z.object({ file: z.instanceof(File) }),
    handler: (input, context) => {
      requireUser(context.locals.user);
      assertFile(input.file, RESUME_TYPES, 10 * MB, 'CV');
      return run(async () => ({ resumeUrl: await context.locals.services.candidate.uploadResume(input.file) }));
    },
  }),
};
