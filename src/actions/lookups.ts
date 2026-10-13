/**
 * [MODÜL: SEÇENEK LİSTESİ ACTION'I]
 * Amaç: Formlardaki uzun seçenek listelerini (üniversite, bölüm, sınıf) ihtiyaç anında vermek.
 * Neden action: Bu listeler yüzlerce kayıt; sayfa HTML'ine gömülmek yerine form açıldığında bir
 *       kez istenir. Sunucuda 1 saat önbelleklidir, API'ye tekrar tekrar gidilmez.
 */

import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';

export const lookups = {
  education: defineAction({
    input: z.object({}).optional(),
    handler: async (_input, context) => {
      const { lookups: repo } = context.locals.services;
      const [universities, departments, grades] = await Promise.all([repo.universities(), repo.universityDepartments(), repo.classes()]);
      return { universities, departments, grades };
    },
  }),
};
