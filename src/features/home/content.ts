/**
 * [MODÜL: ANA SAYFA İÇERİĞİ]
 * Amaç: Ana sayfadaki sabit metin listelerini (özellik kartları)
 *       bileşenlerden ayırmak. İçerik değişikliği için şablona dokunulmaz (SRP).
 */

import { Bolt, BrainCircuit, GraduationCap } from 'lucide-react';
import type { NavIcon } from '@/shared/ui';

/** Özellik kartı renk temaları — Tailwind sınıfları tam yazılır ki derleyici tarayabilsin. */
export type FeatureTone = 'primary' | 'blue' | 'purple';

export interface Feature {
  readonly title: string;
  readonly description: string;
  readonly icon: NavIcon;
  readonly tone: FeatureTone;
}

export const FEATURES: readonly Feature[] = [
  {
    title: 'Tek Tıkla Başvuru',
    description: 'Özgeçmişini bir kere doldur, ilgini çeken staj ve iş ilanlarına saniyeler içinde başvur. Form doldurma derdine son.',
    icon: Bolt,
    tone: 'primary',
  },
  {
    title: 'Akıllı Eşleşme',
    description: 'Bölümüne, yeteneklerine ve hedeflerine en uygun şirketlerle seni direkt buluşturuyoruz. Zaman kaybetme.',
    icon: BrainCircuit,
    tone: 'blue',
  },
  {
    title: 'Akademi ve Etkinlikler',
    description: 'Sadece ilan değil; sektör liderlerinin katıldığı bootcampler, hackathonlar ve eğitimlerle kendini sürekli geliştir.',
    icon: GraduationCap,
    tone: 'purple',
  },
];
