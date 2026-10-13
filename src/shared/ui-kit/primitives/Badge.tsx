/**
 * @file Durum etiketlerini ortak görsel dil ile sunar.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya temel UI yapı taşı olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import type { ReactNode } from 'react';

/**
 * BadgeProps, temel UI yapı taşı içinde kullanılan veri sözleşmesini tek yerde toplar.
 * Bu tipin ayrı tutulması, admin sayfasında aynı veriyi kullanan componentlerin birbirine gevşek bağlı kalmasını sağlar.
 */
export interface BadgeProps {
  children?: ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'gray';
  className?: string;
}

/**
 * variantClasses, ekranda veya iş kuralında tekrar kullanılan seçenekleri tek kaynakta toplar.
 * Sabit listenin ayrı durması, yeni admin ekranı aynı seçenekleri kullanırken tutarsızlık oluşmasını engeller.
 */
const variantClasses: Required<Record<NonNullable<BadgeProps['variant']>, string>> = {
  primary: 'bg-primary-50 text-primary-700 border border-primary-100',
  success: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  warning: 'bg-amber-50 text-amber-600 border border-amber-100',
  danger: 'bg-red-50 text-red-600 border border-red-100',
  info: 'bg-blue-50 text-blue-600 border border-blue-100',
  gray: 'bg-slate-50 text-slate-500 border border-slate-100',
};

/**
 * Badge, temel UI yapı taşı için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
