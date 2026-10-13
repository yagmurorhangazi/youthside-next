/**
 * @file Toast.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

/**
 * ToastType, ortak UI bileşeni içinde kullanılan veri sözleşmesini tek yerde toplar.
 * Bu tipin ayrı tutulması, admin sayfasında aynı veriyi kullanan componentlerin birbirine gevşek bağlı kalmasını sağlar.
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
    onClose: (id: string) => void;
}

/**
 * Toast, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const Toast: React.FC<ToastProps> = ({ id, message, type, duration = 4000, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setIsVisible(true));

        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onClose(id), 300); // Wait for exit animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, id, onClose]);

    const icons = {
        success: <CheckCircle size={20} className="text-emerald-500" />,
        error: <AlertOctagon size={20} className="text-red-500" />,
        warning: <AlertTriangle size={20} className="text-amber-500" />,
        info: <Info size={20} className="text-blue-500" />
    };

    const styles = {
        success: "bg-white border-l-4 border-l-emerald-500",
        error: "bg-white border-l-4 border-l-red-500",
        warning: "bg-white border-l-4 border-l-amber-500",
        info: "bg-white border-l-4 border-l-blue-500"
    };

    return (
        <div 
            className={`
                flex items-center gap-3 p-4 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 min-w-[320px] max-w-md
                transition-all duration-300 transform
                ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
                ${styles[type]}
            `}
        >
            <div className="shrink-0">{icons[type]}</div>
            <p className="flex-1 text-sm font-semibold text-slate-700 leading-snug">{message}</p>
            <button 
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(() => onClose(id), 300);
                }}
                className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors p-1"
            >
                <X size={16} />
            </button>
        </div>
    );
};
