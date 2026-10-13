/**
 * [MODÜL: ACTION HATA DÖNÜŞTÜRÜCÜ]
 * Amaç: Servislerden gelen `ApiError`'u istemcinin anlayacağı `ActionError`'a çevirmek.
 * DRY: Her action aynı try/catch eşlemesini tekrar yazmaz; `run()` sarmalayıcısını kullanır.
 *
 * Kullanıcıya API'nin Türkçe mesajı gösterilir (zaten son kullanıcıya yönelik yazılmış);
 * beklenmeyen hatalarda teknik detay sızdırılmaz, sunucu loguna yazılır.
 */

import { ActionError } from 'astro:actions';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/shared/api/errors';

type ActionErrorCode = ConstructorParameters<typeof ActionError>[0]['code'];

const STATUS_TO_CODE: Record<number, ActionErrorCode> = {
  0: 'SERVICE_UNAVAILABLE',
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_CONTENT',
  429: 'TOO_MANY_REQUESTS',
};

export function toActionError(error: unknown): ActionError {
  if (error instanceof ActionError) return error;
  if (error instanceof ApiError) {
    return new ActionError({ code: STATUS_TO_CODE[error.status] ?? 'INTERNAL_SERVER_ERROR', message: error.message });
  }
  console.error('[ACTION] Beklenmeyen hata:', error);
  return new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: GENERIC_ERROR_MESSAGE });
}

/** Servis çağrısını çalıştırır; hata olursa ActionError fırlatır. */
export async function run<T>(task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch (error) {
    throw toActionError(error);
  }
}

/** Giriş gerektiren action'larda oturum kontrolü. */
export function requireUser(user: App.Locals['user']): asserts user is NonNullable<App.Locals['user']> {
  if (!user) throw new ActionError({ code: 'UNAUTHORIZED', message: 'Bu işlem için giriş yapmalısın.' });
}
