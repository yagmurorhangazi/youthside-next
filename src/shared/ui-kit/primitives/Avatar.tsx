/**
 * @file Avatar görselini ve metin fallback davranışını izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya temel UI yapı taşı olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import { useEffect, useState } from 'react';

export interface AvatarProps {
  /** Görsel yüklenemezse (ör. süresi dolmuş imzalı CDN adresi) `fallback`'e düşer. */
  src?: string | null;
  alt: string;
  fallback: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * sizeClasses, ekranda veya iş kuralında tekrar kullanılan seçenekleri tek kaynakta toplar.
 * Sabit listenin ayrı durması, yeni admin ekranı aynı seçenekleri kullanırken tutarsızlık oluşmasını engeller.
 */
const sizeClasses: Required<Record<NonNullable<AvatarProps['size']>, string>> = {
  sm: 'w-8 h-8',
  md: 'w-11 h-11',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

/**
 * Görsel yoksa aynı boyutta metin fallback üretir; layout kaymasını engeller.
 */
export function Avatar({ src, alt, fallback, size = 'md', className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  // Kaynak değişince yeniden denemeye izin ver (farklı kişi, güncellenmiş URL).
  useEffect(() => setFailed(false), [src]);

  return (
    <div className={`relative inline-block rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100 ${sizeClasses[size]} ${className}`}>
      {src && !failed ? (
        <img src={src} alt={alt} onError={() => setFailed(true)} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-primary-50 text-primary-700 font-bold uppercase">
          {fallback}
        </div>
      )}
    </div>
  );
}
