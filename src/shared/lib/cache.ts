/**
 * [MODÜL: BELLEK İÇİ ÖNBELLEK]
 * Amaç: Nadiren değişen verileri (şehir listesi, çalışma tipleri, üniversiteler) her istekte
 *       API'den çekmemek ve aynı anda gelen eş istekleri tek çağrıya indirmek.
 *
 * Kapsam: Yalnızca sunucu sürecinde yaşar (Node). Kullanıcıya özel veri buraya KONMAZ.
 * Hata durumunda değer önbelleğe yazılmaz; sonraki istek yeniden dener.
 */

interface Entry {
  readonly value: unknown;
  readonly expiresAt: number;
}

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = loader()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

export const ONE_MINUTE = 60_000;
export const ONE_HOUR = 60 * ONE_MINUTE;
