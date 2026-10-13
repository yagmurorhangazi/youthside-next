/**
 * @file Select alanını ortak form API'si ile sunar.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya temel UI yapı taşı olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import type { ChangeEventHandler, SelectHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * SelectOption, temel UI yapı taşı içinde kullanılan veri sözleşmesini tek yerde toplar.
 * Bu tipin ayrı tutulması, admin sayfasında aynı veriyi kullanan componentlerin birbirine gevşek bağlı kalmasını sağlar.
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * SelectProps, temel UI yapı taşı içinde kullanılan veri sözleşmesini tek yerde toplar.
 * Bu tipin ayrı tutulması, admin sayfasında aynı veriyi kullanan componentlerin birbirine gevşek bağlı kalmasını sağlar.
 */
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  icon?: LucideIcon;
  className?: string;
  value?: string | number | readonly string[];
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  error?: string;
}

/**
 * Native select kullanır; erişilebilirlik ve form entegrasyonu tarayıcıya bırakılır.
 */
export function Select({ label, options, icon: Icon, error, className = '', ...props }: SelectProps) {
  return (
    <div className="w-full space-y-1.5">
      {label && <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>}
      <div className="relative group">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary-500 transition-colors pointer-events-none" size={16} />}
        <select
          className={`
            w-full bg-slate-50/50 border border-slate-200/60 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700
            appearance-none focus:outline-none focus:ring-4 focus:ring-primary-500/5 focus:border-primary-400 focus:bg-white
            transition-all duration-200 cursor-pointer ${Icon ? 'pl-11' : ''} ${error ? 'border-red-300 ring-red-500/10' : ''} ${className}
          `}
          {...props}
        >
          {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      {error && <p className="text-[10px] font-bold text-red-500 ml-1">{error}</p>}
    </div>
  );
}
