/**
 * @file Uygulama genelindeki buton varyantlarını izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya temel UI yapı taşı olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * ButtonProps, temel UI yapı taşı içinde kullanılan veri sözleşmesini tek yerde toplar.
 * Bu tipin ayrı tutulması, admin sayfasında aynı veriyi kullanan componentlerin birbirine gevşek bağlı kalmasını sağlar.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: LucideIcon;
  isLoading?: boolean;
  children?: ReactNode;
}

/**
 * variantClasses, ekranda veya iş kuralında tekrar kullanılan seçenekleri tek kaynakta toplar.
 * Sabit listenin ayrı durması, yeni admin ekranı aynı seçenekleri kullanırken tutarsızlık oluşmasını engeller.
 */
const variantClasses: Required<Record<NonNullable<ButtonProps['variant']>, string>> = {
  primary: 'bg-primary-700 text-white hover:bg-primary-800 shadow-lg shadow-primary-700/10',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  outline: 'bg-transparent border border-slate-200 text-slate-600 hover:border-primary-500 hover:text-primary-700',
  ghost: 'bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
};

/**
 * sizeClasses, ekranda veya iş kuralında tekrar kullanılan seçenekleri tek kaynakta toplar.
 * Sabit listenin ayrı durması, yeni admin ekranı aynı seçenekleri kullanırken tutarsızlık oluşmasını engeller.
 */
const sizeClasses: Required<Record<NonNullable<ButtonProps['size']>, string>> = {
  sm: 'h-9 px-4 text-xs tracking-wide',
  md: 'h-11 px-6 text-sm tracking-wide',
  lg: 'h-13 px-8 text-base',
  icon: 'h-10 w-10 p-0',
};

const baseStyle = 'inline-flex items-center justify-center font-bold transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] rounded-2xl whitespace-nowrap';

/**
 * [youthside-next eklemesi] Buton görünümünü element'ten bağımsız üretir.
 * Neden: `<a>` olarak render edilmesi gereken aksiyonlar (ButtonLink) aynı varyant
 * tablosunu kullanabilsin; stil tek kaynakta kalsın (DRY).
 */
export function buttonClassName(
  variant: NonNullable<ButtonProps['variant']> = 'primary',
  size: NonNullable<ButtonProps['size']> = 'md',
  className = '',
): string {
  return `${baseStyle} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
}

/**
 * Yüklenme, ikon ve varyant davranışları burada kalır; kullanan ekranlar
 * sadece aksiyonun ne olduğunu belirler.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className = '',
  isLoading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button className={buttonClassName(variant, size, className)} disabled={isLoading || disabled} {...props}>
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        Icon && <Icon size={size === 'sm' ? 14 : 18} className={children ? 'mr-2.5' : ''} strokeWidth={2.5} />
      )}
      {children}
    </button>
  );
}
