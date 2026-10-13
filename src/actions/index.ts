/**
 * [MODÜL: ACTION KAYIT NOKTASI]
 * Amaç: Tüm sunucu action'larını Astro'ya tanıtmak. İstemci `actions.auth.login(...)` gibi çağırır.
 * Her alanın action'ı kendi dosyasındadır (SRP); burada yalnızca birleştirilir.
 */

import { auth } from './auth';
import { lookups } from './lookups';
import { participation } from './participation';
import { profile } from './profile';

export const server = {
  auth,
  participation,
  profile,
  lookups,
};
