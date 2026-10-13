/**
 * [MODÜL: ÖDÜL KARTI — İŞ KURALLARI]
 * Amaç: Ödül kartında ne kadar metin gösterileceğine ve "Detayları görüntüle" butonunun
 *       ne zaman çıkacağına karar vermek.
 * Neden sunucuda: Referans site taşmayı tarayıcıda JS ile ölçüyor; burada karar render sırasında
 *                 verilir → buton yalnızca gerektiğinde hydrate olur, kart düzeni kaymaz.
 * Referans: youthside-2026-ui (yeni-is-veren-header) → sirket-profili/oduller/index.php
 */

import { truncate } from '@/shared/lib/text';
import type { Award } from '../types';

/** Kartta gösterilen önizlemenin üst sınırı (≈ 4 satır). */
const PREVIEW_LENGTH = 180;

export function awardPreview(award: Pick<Award, 'description'>): string | null {
  return award.description ? truncate(award.description, PREVIEW_LENGTH) : null;
}

/** Metin kırpıldıysa tamamı detay penceresinde okunur. */
export function hasAwardDetails(award: Pick<Award, 'description'>): boolean {
  return (award.description?.length ?? 0) > PREVIEW_LENGTH;
}
