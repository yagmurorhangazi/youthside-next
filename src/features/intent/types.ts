/**
 * [MODÜL: BEKLEYEN NİYET (PENDING INTENT) TİPLERİ]
 * Amaç: Kullanıcının yarıda kalan "ilana başvur" / "etkinliğe kaydol" isteğinin veri sözleşmesi.
 *
 * Neden: Başvuru ile gönderim arasına giriş, kayıt, e-posta doğrulama, 2FA veya profil tamamlama
 * girebilir. Niyet sunucu oturumunda saklanır; kullanıcı hangi sayfaya düşerse düşsün koşullar
 * sağlandığında global popup ile kaldığı yerden devam ettirilir. İşveren hiçbir başvuruyu kaçırmaz.
 * Referans: youthside-2026-ui → sessionStorage['ys_redirect_intent_v1'] (yalnızca ilanlar içindi).
 */

import type { Contract } from '@/features/common/types';
import type { JobQuestion } from '@/features/jobs/types';

export type IntentKind = 'job' | 'event';

export interface PendingIntent {
  readonly kind: IntentKind;
  /** API'deki ilan/etkinlik UUID'si (gönderimde kullanılır). */
  readonly targetId: string;
  readonly slug: string;
  /** Kanonik detay sayfası yolu (ör. /acme/ilanlar/frontend-stajyeri). */
  readonly path: string;
  readonly title: string;
  readonly companyName: string;
  readonly imageUrl: string | null;
  /** Epoch ms — 24 saatlik ömür buradan hesaplanır. */
  readonly createdAt: number;
  /** Kullanıcı "Daha sonra" dedi: popup bu oturumda kendiliğinden açılmaz, yalnızca şerit görünür. */
  readonly snoozed: boolean;
}

/**
 * Niyetin bir sonraki adımı:
 *   login            → misafir; giriş yapmalı
 *   complete_profile → ilan için profil %75'in altında
 *   confirm_auto     → engel yok; 5 sn geri sayımla otomatik gönderilir
 *   confirm_manual   → zorunlu soru/sözleşme var; kullanıcı formu onaylamalı (KVKK açık rıza)
 *   done             → zaten başvurmuş/kaydolmuş → niyet silinir
 *   closed           → süre doldu / kontenjan doldu / dış başvuru → niyet silinir, kullanıcı bilgilendirilir
 */
export type IntentStep = 'login' | 'complete_profile' | 'confirm_auto' | 'confirm_manual' | 'done' | 'closed';

/** Popup'ın ihtiyaç duyduğu görünüm modeli (`intent.resolve` action'ının sonucu). */
export interface IntentPrompt {
  readonly intent: Omit<PendingIntent, 'snoozed' | 'createdAt'>;
  readonly step: IntentStep;
  readonly completeness: { readonly percentage: number; readonly threshold: number } | null;
  readonly questions: readonly JobQuestion[];
  readonly contracts: readonly Contract[];
}

/** Layout'un SSR'da bildiği hafif özet (popup/şerit gösterilsin mi?). */
export type IntentSummary = Pick<PendingIntent, 'kind' | 'title' | 'path' | 'snoozed'>;

/** Niyetin saklandığı yer (DIP: bugün Astro oturumu, yarın başka bir depo olabilir). */
export interface IntentStore {
  read(): Promise<PendingIntent | null>;
  save(intent: PendingIntent): void;
  clear(): void;
}
