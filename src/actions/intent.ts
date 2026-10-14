/**
 * [MODÜL: BEKLEYEN NİYET ACTION'LARI]
 * Amaç: Tarayıcının yarıda kalan başvuru/kayıt niyetini yakalaması, durumunu sorması ve
 *       ertelemesi/vazgeçmesi. Gönderim için yeni action yoktur; popup mevcut
 *       `participation.apply` / `participation.registerEvent`'i çağırır (DRY).
 * Referans: youthside-2026-ui → persistRedirectIntent / readRedirectIntent / clearRedirectIntent
 */

import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { run } from './errors';

const slugSchema = z.string().trim().min(1).max(200).regex(/^[^/?#\s]+$/, 'Geçersiz adres.');

export const intent = {
  /** "Giriş yap ve başvur", "Profilimi tamamla" gibi bir yönlendirmeden hemen önce çağrılır. Misafir de çağırabilir. */
  capture: defineAction({
    input: z.object({ kind: z.enum(['job', 'event']), slug: slugSchema }),
    handler: (input, context) =>
      run(async () => ({ captured: (await context.locals.services.intent.capture(input.kind, input.slug)) !== null })),
  }),

  /** Popup'ın göstereceği adım + form verisi. Niyet yoksa null. */
  resolve: defineAction({
    handler: (_input, context) => run(() => context.locals.services.intent.resolve()),
  }),

  /** snooze: "Daha sonra" · resume: şeritten "Devam et" · discard: "Vazgeç" */
  dismiss: defineAction({
    input: z.object({ mode: z.enum(['snooze', 'resume', 'discard']) }),
    handler: (input, context) =>
      run(async () => {
        const service = context.locals.services.intent;
        if (input.mode === 'snooze') await service.snooze();
        else if (input.mode === 'resume') await service.resume();
        else service.discard();
        return { ok: true as const };
      }),
  }),
};
