/**
 * @file ProgressBar.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import React, { useEffect, useState } from 'react';

/**
 * ProgressBarProps, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
export interface ProgressBarProps {
    isAnimating: boolean;
}

/**
 * ProgressBar, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ isAnimating }) => {
    const [progress, setProgress] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        let timeout: ReturnType<typeof setTimeout> | undefined;

        if (isAnimating) {
            setIsVisible(true);
            setProgress(0);
            
            // Start progress
            interval = setInterval(() => {
                setProgress(prev => {
                    // Slow down as it approaches 90%
                    if (prev >= 90) return prev;
                    // Initial jump
                    if (prev === 0) return 20;
                    // Increment
                    const increment = Math.random() * 10;
                    return Math.min(prev + increment, 90);
                });
            }, 200);

        } else if (!isAnimating && isVisible) {
            // Complete animation
            setProgress(100);
            
            // Hide after completion
            timeout = setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => setProgress(0), 300);
            }, 400); 
        }

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [isAnimating, isVisible]);

    return (
        <div 
            className={`fixed top-0 left-0 w-full h-[3px] z-[99999] pointer-events-none transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
            <div 
                className="h-full bg-gradient-to-r from-primary-500 via-primary-400 to-primary-600 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
            />
            {/* Spinner (Optional) */}
            {isVisible && (
                 <div className="absolute top-4 right-4 animate-spin">
                    <div className="w-4 h-4 border-2 border-transparent border-t-primary-500 border-l-primary-500 rounded-full shadow-sm"></div>
                 </div>
            )}
        </div>
    );
};
