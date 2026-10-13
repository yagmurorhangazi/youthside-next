/**
 * [MODÜL: EĞİTİM SEÇENEKLERİ HOOK'U — İSTEMCİ]
 * Amaç: Üniversite, bölüm ve sınıf listelerini form açıldığında bir kez almak.
 * Kullanım: Hızlı etkinlik kaydı ve profil formu (DRY). Listeler sunucuda önbelleklidir.
 * Hata olursa boş liste döner; alanlar serbest metin olarak çalışmaya devam eder.
 */

import { useEffect, useState } from 'react';
import { actions } from 'astro:actions';

export interface EducationOptions {
  readonly universities: readonly string[];
  readonly departments: readonly string[];
  readonly grades: readonly string[];
}

const EMPTY: EducationOptions = { universities: [], departments: [], grades: [] };

export function useEducationOptions(): EducationOptions {
  const [options, setOptions] = useState<EducationOptions>(EMPTY);

  useEffect(() => {
    let active = true;
    actions.lookups
      .education({})
      .then(({ data }) => {
        if (active && data) setOptions(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return options;
}
