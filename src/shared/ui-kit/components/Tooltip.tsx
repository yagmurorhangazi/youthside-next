/**
 * @file Tooltip.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * [MODÜL: PREMIUM TOOLTIP BİLEŞENİ]
 * 
 * Amaç: Sınırlandırılmış (overflow-hidden, scroll vb.) container'lar içinde dahi 
 * kesilmeden gösterilebilmesi için React Portal kullanılarak Document.Body'ye 
 * eklenen, yüksek performanslı ve premium UI/UX sunan tooltip bileşenidir.
 * 
 * Özellikler:
 * - Taşmaları (overflow) aşmak için Portal mimarisi
 * - Fade-in/out mikro animasyonlar
 * - Hover gecikmesi (UX standartı)
 * - Otomatik pozisyon hesaplama (Top/Bottom/Left/Right)
 */

export interface TooltipProps {
    /** Tooltip içinde gösterilecek içerik (Yazı veya HTML) */
    content: React.ReactNode;
    /** Tooltip'in tetikleneceği sarıcı bileşen */
    children: React.ReactElement;
    /** Tooltip'in konumu. Varsayılan: top */
    position?: 'top' | 'bottom' | 'left' | 'right';
    /** Saniye cinsinden gecikme (Hover sonrası) */
    delay?: number;
    /** Ekstra CSS sınıfları (Tooltip kutusu için) */
    className?: string;
    /** Tooltip'in aktif olup olmayacağı (Eğer uzunluk kritere uymuyorsa kapatılabilir) */
    disabled?: boolean;
}

/**
 * Tooltip, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const Tooltip = ({
    content,
    children,
    position = 'top',
    delay = 300,
    className = '',
    disabled = false
}: TooltipProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isRendered, setIsRendered] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    /**
     * updatePosition, tooltip'i body portalında doğru koordinata taşır.
     *
     * Neden bu hesap component içinde?
     * - Tooltip body'ye portal edilir; bu yüzden normal CSS parent konumundan yararlanamaz.
     * - Scroll ve viewport taşması her renderda değil, sadece görünürken hesaplanmalıdır.
     * - Admin tablolarında overflow-hidden/scroll container çok kullanıldığı için tooltip'in
     *   kesilmemesi bu componentin ana sorumluluğudur.
     */
    const updatePosition = () => {
        if (!triggerRef.current || !tooltipRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();

        const scrollY = window.scrollY || window.pageYOffset;
        const scrollX = window.scrollX || window.pageXOffset;

        let top = 0;
        let left = 0;

        const offset = 8; // Tetikleyici ile tooltip arasındaki boşluk (px)

        switch (position) {
            case 'top':
                top = triggerRect.top + scrollY - tooltipRect.height - offset;
                left = triggerRect.left + scrollX + (triggerRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'bottom':
                top = triggerRect.bottom + scrollY + offset;
                left = triggerRect.left + scrollX + (triggerRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'left':
                top = triggerRect.top + scrollY + (triggerRect.height / 2) - (tooltipRect.height / 2);
                left = triggerRect.left + scrollX - tooltipRect.width - offset;
                break;
            case 'right':
                top = triggerRect.top + scrollY + (triggerRect.height / 2) - (tooltipRect.height / 2);
                left = triggerRect.right + scrollX + offset;
                break;
        }

        // Viewport taşmalarını engelleme (Edge collision detection)
        if (left < offset) left = offset;
        if (top < offset) top = triggerRect.bottom + scrollY + offset; // Üstten çıkarsa alta al

        setCoords({ top, left });
    };

    /**
     * handleMouseEnter, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const handleMouseEnter = () => {
        if (disabled) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            setIsRendered(true);
            setIsVisible(true);
        }, delay);
    };

    /**
     * handleMouseLeave, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const handleMouseLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
        // Fade-out animasyonu için dom'dan kaldırmayı geciktir
        setTimeout(() => setIsRendered(false), 200); 
    };

    // Resize ve scroll eventlerinde tooltip'i güncelle
    useEffect(() => {
        if (isVisible) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true); // true: capture phase (scrollable parentlar için)
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isVisible, position]);

    // content degistiginde position guncellemeye gerek yok, dilediginizde setTimeout ile guncelleyebilirsiniz.

    return (
        <>
            {/* Orijinal children sarmalanarak DOM çarpışması ve sonsuz memory sızıntısı önlenir */}
            <div 
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="w-full"
            >
                {children}
            </div>

            {/* Portal ile Document Body sonuna Tooltip eklenir */}
            {isRendered && createPortal(
                <div
                    ref={tooltipRef}
                    style={{
                        top: `${coords.top}px`,
                        left: `${coords.left}px`,
                        position: 'absolute',
                    }}
                    className={`
                        z-[99999] px-2.5 py-1.5 bg-slate-800 text-white text-[11px] font-medium 
                        rounded-md shadow-lg pointer-events-none max-w-[280px] break-words
                        transition-all duration-200 ease-out origin-center
                        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
                        ${className}
                    `}
                >
                    {content}
                    
                    {/* Yön Okları (Arrow) */}
                    <div className={`
                        absolute w-2 h-2 bg-slate-800 transform rotate-45
                        ${position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' : ''}
                        ${position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' : ''}
                        ${position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' : ''}
                        ${position === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2' : ''}
                    `} />
                </div>,
                document.body
            )}
        </>
    );
};
