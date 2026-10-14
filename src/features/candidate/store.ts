/**
 * [MODÜL: ADAY PROFİLİ SİNYALLERİ — NANOSTORES]
 * Amaç: Profil sayfasındaki island'ların (bilgi formu, fotoğraf/CV kartı) ve global bekleyen niyet
 *       hatırlatıcısının sayfa yenilemeden aynı veriyi görmesi.
 *   - `$completeness`: Kayıt/yükleme sonrası API'nin döndürdüğü doluluk. Eşik geçilince bekleyen
 *     başvuru popup'ı açılır.
 *   - `$resumeUrl`: Otomatik üretilen CV, CV kartında hemen görünür.
 *   - `$resumeData`: Formda son kaydedilen bilgiler; "Profilimden CV oluştur" güncel veriyi kullanır.
 */

import { atom } from 'nanostores';
import type { ResumeData } from './types';

export interface CompletenessSignal {
  readonly percentage: number;
  readonly isEligible: boolean;
}

export const $completeness = atom<CompletenessSignal | null>(null);
export const $resumeUrl = atom<string | null>(null);
export const $resumeData = atom<ResumeData | null>(null);
