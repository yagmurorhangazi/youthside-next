/**
 * @file Kart tabanlı yüzey bileşenlerini tek sorumlulukla sunar.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya temel UI yapı taşı olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import type { ReactNode } from 'react';

/**
 * CardProps, temel UI yapı taşı içinde kullanılan veri sözleşmesini tek yerde toplar.
 * Bu tipin ayrı tutulması, admin sayfasında aynı veriyi kullanan componentlerin birbirine gevşek bağlı kalmasını sağlar.
 */
export interface CardProps {
  children?: ReactNode;
  className?: string;
}

/**
 * Yönetim ekranlarında tekrar kullanılacak beyaz içerik yüzeyi.
 * Sadece dış çerçeve sorumluluğunu taşır; başlık ve içerik ayrı bileşenlerdir.
 */
export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${className}`}>
      {children}
    </div>
  );
}

/**
 * CardHeader, temel UI yapı taşı için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export function CardHeader({ children, className = '' }: CardProps) {
  return (
    <div className={`px-4 py-4 sm:px-8 sm:py-6 border-b border-slate-50 ${className}`}>
      {children}
    </div>
  );
}

/**
 * CardContent, temel UI yapı taşı için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export function CardContent({ children, className = '' }: CardProps) {
  return <div className={`p-4 sm:p-8 ${className}`}>{children}</div>;
}
