/**
 * @file Kullanıcı bilgisinin soyutlaması. "E-postanız" alanı buradan, useCurrentUser üzerinden dolar.
 */

import type { CurrentUser, RequestControl } from './types';

export interface AuthClient {
  /** Doğrulanmış oturumdaki kullanıcı. Oturum yoksa 401 ApiError fırlatır. */
  getCurrentUser(control?: RequestControl): Promise<CurrentUser>;
}
