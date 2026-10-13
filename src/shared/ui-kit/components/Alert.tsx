/**
 * @file Alert.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

/**
 * AlertVariant, ortak UI bileşeni içinde kullanılan veri sözleşmesini tek yerde toplar.
 * Bu tipin ayrı tutulması, admin sayfasında aynı veriyi kullanan componentlerin birbirine gevşek bağlı kalmasını sağlar.
 */
export type AlertVariant = 'success' | 'warning' | 'error' | 'info';

/**
 * AlertProps, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
export interface AlertProps { 
    variant?: AlertVariant; 
    title?: string;
    children: React.ReactNode; 
    className?: string; 
}

/**
 * Alert, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const Alert = ({ variant = 'info', title, children, className = '' }: AlertProps) => {
    const styles = {
        success: "bg-emerald-50 border-emerald-100 text-emerald-800",
        warning: "bg-amber-50 border-amber-100 text-amber-800",
        error: "bg-red-50 border-red-100 text-red-800",
        info: "bg-blue-50 border-blue-100 text-blue-800"
    };

    const icons = {
        success: <CheckCircle size={18} className="text-emerald-600 mt-0.5" />,
        warning: <AlertTriangle size={18} className="text-amber-600 mt-0.5" />,
        error: <XCircle size={18} className="text-red-600 mt-0.5" />,
        info: <Info size={18} className="text-blue-600 mt-0.5" />
    };

    return (
        <div className={`p-4 rounded-xl border flex gap-3 text-sm leading-relaxed ${styles[variant]} ${className}`}>
            <div className="shrink-0">{icons[variant]}</div>
            <div className="flex-1">
                {title && <h5 className="font-bold mb-1">{title}</h5>}
                <div className="opacity-90 font-medium">{children}</div>
            </div>
        </div>
    );
};
