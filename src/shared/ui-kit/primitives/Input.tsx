/**
 * @file Form input bileşenlerini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya temel UI yapı taşı olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import { forwardRef } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * InputProps, temel UI yapı taşı içinde kullanılan veri sözleşmesini tek yerde toplar.
 * Bu tipin ayrı tutulması, admin sayfasında aynı veriyi kullanan componentlerin birbirine gevşek bağlı kalmasını sağlar.
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  errorId?: string;
}

/**
 * Etiket, ikon ve hata mesajı davranışını tek yerde standardize eder.
 * Form ekranları yalnızca veri bağlama ile ilgilenir.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, icon: Icon, error, errorId, className = '', ...props }, ref) => (
  <div className="w-full space-y-1.5">
    {label && <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>}
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary-500 transition-colors" size={16} />}
      <input
        ref={ref}
        className={`
          w-full bg-slate-50/50 border border-slate-200/60 rounded-2xl px-4 py-3 text-sm font-medium
          placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary-500/5 focus:border-primary-400 focus:bg-white
          transition-all duration-200 ${Icon ? 'pl-11' : ''} ${error ? 'border-red-300 ring-red-500/10' : ''} ${className}
        `}
        {...props}
      />
    </div>
    {error && <p id={errorId} className="text-[10px] font-bold text-red-500 ml-1">{error}</p>}
  </div>
));

Input.displayName = 'Input';

/**
 * TextareaProps, temel UI yapı taşı içinde kullanılan veri sözleşmesini tek yerde toplar.
 * Bu tipin ayrı tutulması, admin sayfasında aynı veriyi kullanan componentlerin birbirine gevşek bağlı kalmasını sağlar.
 */
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

/**
 * Textarea, temel UI yapı taşı için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, className = '', ...props }, ref) => (
  <div className="w-full space-y-1.5">
    {label && <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>}
    <textarea
      ref={ref}
      className={`
        w-full bg-slate-50/50 border border-slate-200/60 rounded-2xl px-4 py-3 text-sm font-medium
        placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary-500/5 focus:border-primary-400 focus:bg-white
        transition-all duration-200 min-h-[100px] resize-y ${error ? 'border-red-300 ring-red-500/10' : ''} ${className}
      `}
      {...props}
    />
    {error && <p className="text-[10px] font-bold text-red-500 ml-1">{error}</p>}
  </div>
));

Textarea.displayName = 'Textarea';
