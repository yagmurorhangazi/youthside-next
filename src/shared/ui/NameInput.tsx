/**
 * [MODÜL: KİŞİ ADI ALANI — UI KIT GENİŞLETMESİ]
 * Amaç: Ad ve soyad girişlerinde Türkçe karakterlere uygun başlangıç büyük harfini ortaklaştırmak.
 * Neden: Kayıt, hızlı kayıt ve profil formlarının aynı değeri göstermesi ve göndermesi gerekir.
 */

import { forwardRef, type ChangeEvent } from 'react';
import { capitalizePersonName } from '@/shared/lib/text';
import { Input, type InputProps } from '../ui-kit';

export const NameInput = forwardRef<HTMLInputElement, InputProps>(({ onChange, ...props }, ref) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.currentTarget.value = capitalizePersonName(event.currentTarget.value);
    onChange?.(event);
  };

  return <Input ref={ref} type="text" autoCapitalize="words" onChange={handleChange} {...props} />;
});

NameInput.displayName = 'NameInput';
