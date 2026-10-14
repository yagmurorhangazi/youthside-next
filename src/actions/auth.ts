/**
 * [MODÜL: KİMLİK DOĞRULAMA ACTION'LARI]
 * Amaç: Giriş, kayıt ve şifre akışlarının sunucu tarafı işlemleri.
 * Tarayıcı bu action'ları çağırır; API ile yalnızca sunucu konuşur ve token'lar sunucu
 * oturumuna yazılır (tarayıcı JS'i token'ı hiç görmez).
 *
 * Girdi doğrulaması Zod ile yapılır; API'ye geçersiz istek gitmez.
 */

import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { ROUTES, SITE, safeRedirect } from '@/config/site';
import { completeLogin } from '@/features/auth/complete-login';
import { withResumeFlag } from '@/features/intent/lib/intent-rules';
import { ApiError } from '@/shared/api/errors';
import { requireUser, run, toActionError } from './errors';
import { emailSchema, nameSchema, passwordSchema } from './schemas';

export const auth = {
  /**
   * Aday girişi. Olası sonuçlar:
   *   - { status: 'ok', redirect }          → oturum açıldı
   *   - { status: 'otp_required' }          → hesapta 2FA açık, kod istenmeli
   *   - { status: 'unverified' }            → e-posta doğrulanmamış
   * Diğer hatalar (yanlış şifre, çok fazla deneme) ActionError olarak döner.
   */
  login: defineAction({
    input: z.object({
      email: emailSchema,
      password: z.string().min(1, 'Şifreni gir.').max(128),
      otpCode: z.string().trim().regex(/^\d{6}$/, '6 haneli kodu gir.').optional(),
      redirect: z.string().max(500).optional(),
    }),
    handler: async (input, context) => {
      try {
        const session = await context.locals.services.auth.login(input.email, input.password, input.otpCode);
        return { status: 'ok' as const, redirect: await completeLogin(context.session, session, input.redirect) };
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 403 && error.errors.require_otp) return { status: 'otp_required' as const };
          if (error.status === 400 && /doğrula/i.test(error.message)) return { status: 'unverified' as const, message: error.message };
        }
        throw toActionError(error);
      }
    },
  }),

  /**
   * Google ile giriş/kayıt. Tarayıcıdaki Google Identity Services `id_token` verir; doğrulamayı API
   * yapar (auth/oauth-login). Aynı e-postalı hesap varsa bağlanır, yoksa yeni aday hesabı açılır.
   */
  googleLogin: defineAction({
    input: z.object({ idToken: z.string().min(20).max(8000), redirect: z.string().max(500).optional() }),
    handler: (input, context) =>
      run(async () => {
        const session = await context.locals.services.auth.oauthLogin({ provider: 'google', idToken: input.idToken });
        return { redirect: await completeLogin(context.session, session, input.redirect) };
      }),
  }),

  register: defineAction({
    input: z
      .object({
        firstName: nameSchema('Ad'),
        lastName: nameSchema('Soyad'),
        email: emailSchema,
        password: passwordSchema,
        passwordConfirm: z.string(),
        acceptTerms: z.boolean().refine((value) => value, 'Devam etmek için kullanım koşullarını kabul etmelisin.'),
      })
      .refine((data) => data.password === data.passwordConfirm, { message: 'Şifreler eşleşmiyor.', path: ['passwordConfirm'] }),
    handler: (input, context) =>
      run(async () => {
        await context.locals.services.auth.register(input);
        return { email: input.email };
      }),
  }),

  forgotPassword: defineAction({
    input: z.object({ email: emailSchema }),
    handler: async (input, context) => {
      try {
        await context.locals.services.auth.forgotPassword(input.email);
      } catch (error) {
        // Hesap var/yok bilgisini sızdırmamak için 404 de başarı gibi gösterilir.
        if (!(error instanceof ApiError && error.status === 404)) throw toActionError(error);
      }
      return { email: input.email };
    },
  }),

  resetPassword: defineAction({
    input: z
      .object({ token: z.string().min(10).max(500), password: passwordSchema, passwordConfirm: z.string() })
      .refine((data) => data.password === data.passwordConfirm, { message: 'Şifreler eşleşmiyor.', path: ['passwordConfirm'] }),
    handler: (input, context) => run(() => context.locals.services.auth.resetPassword(input.token, input.password)),
  }),

  /**
   * Doğrulama bağlantısı giriş sayfasına `?redirect=` ile döner. Bekleyen niyet varsa ilan/etkinlik
   * yolu `?devam=1` ile eklenir: e-posta başka cihazda açılsa bile sayfa niyeti yeniden kurar.
   */
  resendVerification: defineAction({
    input: z.object({ email: emailSchema, redirect: z.string().max(500).optional() }),
    handler: (input, context) =>
      run(async () => {
        const pending = await context.locals.services.intent.summary();
        const target = pending ? withResumeFlag(pending.path) : input.redirect ? safeRedirect(input.redirect) : null;
        const loginUrl = new URL(ROUTES.login, context.url.origin || SITE.url);
        if (target && target !== ROUTES.dashboard) loginUrl.searchParams.set('redirect', target);
        await context.locals.services.auth.resendVerification(input.email, loginUrl.href);
      }),
  }),

  updatePassword: defineAction({
    input: z
      .object({ currentPassword: z.string().min(1, 'Mevcut şifreni gir.'), newPassword: passwordSchema, newPasswordConfirm: z.string() })
      .refine((data) => data.newPassword === data.newPasswordConfirm, { message: 'Şifreler eşleşmiyor.', path: ['newPasswordConfirm'] })
      .refine((data) => data.newPassword !== data.currentPassword, { message: 'Yeni şifre mevcut şifreyle aynı olamaz.', path: ['newPassword'] }),
    handler: (input, context) => {
      requireUser(context.locals.user);
      return run(() => context.locals.services.auth.updatePassword(input.currentPassword, input.newPassword));
    },
  }),
};

