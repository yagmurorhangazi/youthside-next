/**
 * [MODÜL: OTOMATİK CV ÜRETİMİ — TARAYICI]
 * Amaç: Profil bilgisinden PDF CV üretip mevcut `profile.uploadResume` action'ı ile yüklemek.
 *
 * Neden tarayıcıda: PDF üretimi CPU/bellek yoğundur; Node sunucusu yalnızca UI/BFF'dir. İş
 * kullanıcının cihazında yapılır, sunucuya yük binmez. react-pdf ve şablon yalnızca bu fonksiyon
 * çağrıldığında indirilir (dynamic import); diğer sayfaların bundle'ına girmez.
 * Referans: youthside-2026-ui/panelim/profilim → generateAutoCV (html2canvas + jsPDF)
 */

import { actions } from 'astro:actions';
import { toFormErrors } from '@/shared/lib/action-result';
import type { ResumePalette } from './components/ResumeDocument';
import type { ProfileCompleteness, ResumeData } from './types';

export type GenerateResumeResult =
  | { readonly ok: true; readonly resumeUrl: string; readonly completeness: ProfileCompleteness | null }
  | { readonly ok: false; readonly message: string };

/** PDF renkleri tasarım token'larından okunur; renk kodu bu dosyada tekrar yazılmaz. */
function readPalette(): ResumePalette {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  return { accent: token('--color-primary-700'), ink: token('--color-text-light'), muted: token('--color-text-muted-light') };
}

/** Dosya adında Türkçe karakter/boşluk sorun çıkarmasın: "Ayşe Yılmaz" → "ayse-yilmaz-cv.pdf". */
function fileName(fullName: string): string {
  const slug = fullName
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'ozgecmis'}-cv.pdf`;
}

export async function generateAndUploadResume(data: ResumeData): Promise<GenerateResumeResult> {
  try {
    const [{ pdf }, { ResumeDocument, registerResumeFonts }] = await Promise.all([import('@react-pdf/renderer'), import('./components/ResumeDocument')]);
    registerResumeFonts(window.location.origin);
    // Şablon hook kullanmaz; doğrudan çağrılınca react-pdf'in beklediği <Document> öğesini döndürür.
    const blob = await pdf(ResumeDocument({ data, palette: readPalette() })).toBlob();

    const form = new FormData();
    form.append('file', new File([blob], fileName(data.fullName), { type: 'application/pdf' }));
    form.append('source', 'generated');
    const { data: result, error } = await actions.profile.uploadResume(form);
    if (error) return { ok: false, message: toFormErrors(error).message ?? 'CV yüklenemedi.' };
    return { ok: true, resumeUrl: result.resumeUrl, completeness: result.completeness };
  } catch (error) {
    console.error('[CV] Otomatik CV üretilemedi:', error);
    return { ok: false, message: 'CV otomatik oluşturulamadı. Lütfen CV dosyanı elle yükle.' };
  }
}
