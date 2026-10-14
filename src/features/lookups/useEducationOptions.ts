/**
 * [MODÜL: EĞİTİM SEÇENEKLERİ HOOK'U — İSTEMCİ]
 * Amaç: Üniversite, bölüm ve sınıf listelerini form açıldığında bir kez almak.
 * Kullanım: Hızlı etkinlik kaydı ve profil formu (DRY). Listeler sunucuda önbelleklidir.
 * Yükleme/hata durumu ayrıca döner; seçim alanları kullanıcıya doğru geri bildirimi verir.
 */

import { useEffect, useState } from 'react';
import { actions } from 'astro:actions';

export interface EducationOptions {
  readonly universities: readonly string[];
  readonly departments: readonly string[];
  readonly grades: readonly string[];
  readonly loading: boolean;
  readonly failed: boolean;
}

const EMPTY: EducationOptions = { universities: [], departments: [], grades: [], loading: true, failed: false };

export function useEducationOptions(): EducationOptions {
  const [options, setOptions] = useState<EducationOptions>(EMPTY);

  useEffect(() => {
    let active = true;
    actions.lookups
      .education({})
      .then(({ data }) => {
        if (active) setOptions(data ? { ...data, loading: false, failed: false } : { ...EMPTY, loading: false, failed: true });
      })
      .catch(() => {
        if (active) setOptions({ ...EMPTY, loading: false, failed: true });
      });
    return () => {
      active = false;
    };
  }, []);

  return options;
}
