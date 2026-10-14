/**
 * [MODÜL: ŞİFRE ALANI — UI KIT GENİŞLETMESİ]
 * Amaç: Kit'teki Input'u "şifreyi göster/gizle" düğmesiyle sarmak.
 * Neden: Mobilde şifre yazım hatası çok yaygın; göster düğmesi hatalı giriş sayısını azaltır.
 */

import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, Lock } from './icons';
import { Input } from '../ui-kit';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { error?: string };

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(({ className = '', ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={visible ? 'text' : 'password'} icon={Lock} className={`pr-12 ${className}`} {...props} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-gray-400 transition hover:text-gray-700"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';
