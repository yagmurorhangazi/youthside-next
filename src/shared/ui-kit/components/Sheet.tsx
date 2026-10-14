/**
 * @file Sheet.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import React, { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useOverlayDialog } from './useOverlayDialog';

/**
 * SheetProps, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
export interface SheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
    width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closeOnOutsideClick?: boolean;
    closeOnEscape?: boolean;
    initialFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * widthConfig, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
const widthConfig = {
    sm: 'sm:w-[380px]',
    md: 'sm:w-[450px]',
    lg: 'sm:w-[600px]',
    xl: 'sm:w-[800px]',
    full: 'sm:w-[95%]',
};

/**
 * Sheet, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const Sheet: React.FC<SheetProps> = ({ 
    isOpen, 
    onClose, 
    title,
    description,
    children, 
    footer, 
    className = '',
    width = 'md',
    closeOnOutsideClick = true,
    closeOnEscape = true,
    initialFocusRef,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300); // Match transition duration
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useOverlayDialog({ isOpen: isOpen && isVisible, onClose, closeOnEscape, containerRef: panelRef, initialFocusRef });

    if (!isVisible) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] isolate">
            {/* Backdrop */}
            <div 
                className={`
                    fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300
                    ${isOpen ? 'opacity-100' : 'opacity-0'}
                `}
                onClick={closeOnOutsideClick ? onClose : undefined}
                aria-hidden="true"
            />

            {/* Sheet Content */}
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                aria-describedby={description ? descriptionId : undefined}
                aria-label={title ? undefined : 'Yan panel'}
                tabIndex={-1}
                className={`
                    fixed inset-y-0 right-0 flex w-full ${widthConfig[width as keyof typeof widthConfig] || widthConfig.md} flex-col bg-white shadow-2xl transform transition-transform duration-300 ease-out
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                    ${className}
                `}
            >
                {/* Header */}
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
                    <div className="min-w-0">
                        {title && <h2 id={titleId} className="text-lg font-bold text-slate-800 sm:text-xl">{title}</h2>}
                        {description && <div id={descriptionId} className="mt-1 text-sm text-slate-500">{description}</div>}
                    </div>
                    <button 
                        type="button"
                        onClick={onClose}
                        aria-label="Yan paneli kapat"
                        className="-mr-2 -mt-2 flex min-h-11 min-w-11 items-center justify-center rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="shrink-0 border-t border-slate-100 bg-slate-50/50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:py-5">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
