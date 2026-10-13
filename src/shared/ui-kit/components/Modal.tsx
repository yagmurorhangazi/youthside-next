/**
 * @file Modal.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useOverlayDialog } from './useOverlayDialog';

/**
 * ModalProps, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closeOnOutsideClick?: boolean;
    closeOnEscape?: boolean;
    initialFocusRef?: React.RefObject<HTMLElement | null>;
    className?: string;
}

/**
 * Modal, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const Modal: React.FC<ModalProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    size = 'md',
    closeOnOutsideClick = true,
    closeOnEscape = true,
    initialFocusRef,
    className = ''
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    useOverlayDialog({ isOpen, onClose, closeOnEscape, containerRef: modalRef, initialFocusRef });

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-xl',
        lg: 'max-w-3xl',
        xl: 'max-w-5xl',
        full: 'max-w-full m-4'
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div 
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                aria-label={title ? undefined : 'Onay penceresi'}
                tabIndex={-1}
                className={`bg-white rounded-[32px] w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {title ? (
                    <div className="z-10 flex shrink-0 items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6">
                        <div id={titleId} className="text-lg font-bold tracking-tight text-slate-800 sm:text-xl">{title}</div>
                        {onClose && (
                            <button 
                                type="button"
                                onClick={onClose}
                                aria-label="Pencereyi kapat"
                                className="-mr-2 flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                ) : (
                    onClose && (
                        <button 
                            type="button"
                            onClick={onClose}
                            aria-label="Pencereyi kapat"
                            className="absolute right-4 top-4 z-50 flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
                        >
                            <X size={20} />
                        </button>
                    )
                )}

                {/* Content */}
                <div className="overflow-y-auto">
                    {children}
                </div>

                {/* Outside Click Handler (Invisible Backdrop Overlay) */}
                {closeOnOutsideClick && (
                    <div 
                        className="absolute inset-0 -z-10" 
                        onClick={onClose}
                    />
                )}
            </div>
            
            {/* Real Backdrop Click Handler */}
            <div 
                className="absolute inset-0 -z-10"
                onClick={closeOnOutsideClick ? onClose : undefined}
            />
        </div>,
        document.body
    );
};
