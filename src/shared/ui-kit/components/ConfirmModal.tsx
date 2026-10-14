/**
 * @file ConfirmModal.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import React from 'react';
import { Modal } from './Modal';
import { Button } from '../primitives'; // Assuming Button is exported from Common
import { AlertCircle, CheckCircle2, Info, Trash2 } from 'lucide-react';

/**
 * ConfirmModalProps, ortak UI bileşeni içinde kullanılan veri sözleşmesini tek yerde toplar.
 * Bu tipin ayrı tutulması, admin sayfasında aynı veriyi kullanan componentlerin birbirine gevşek bağlı kalmasını sağlar.
 */
export interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    isLoading?: boolean;
    isConfirmDisabled?: boolean;
    children?: React.ReactNode;
}

/**
 * ConfirmModal, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Onayla',
    cancelText = 'İptal',
    variant = 'danger',
    isLoading = false,
    isConfirmDisabled = false,
    children
}) => {
    const variantStyles = {
        danger: {
            icon: Trash2,
            iconBg: 'bg-red-50',
            iconColor: 'text-red-600',
            buttonVariant: 'danger' as const
        },
        warning: {
            icon: AlertCircle,
            iconBg: 'bg-orange-50',
            iconColor: 'text-orange-600',
            buttonVariant: 'secondary' as const 
        },
        info: {
            icon: Info,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            buttonVariant: 'primary' as const
        },
        success: {
            icon: CheckCircle2,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            buttonVariant: 'primary' as const
        }
    };

    const currentStyle = variantStyles[variant];
    const Icon = currentStyle.icon;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <div className="p-6 text-center">
                <div className={`w-16 h-16 ${currentStyle.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <Icon size={32} className={currentStyle.iconColor} />
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {title}
                </h3>
                
                <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                    {description}
                </p>

                {children && <div className="mb-8">{children}</div>}

                <div className="flex items-center gap-3">
                    <Button 
                        variant="ghost" 
                        onClick={onClose}
                        className="flex-1"
                        disabled={isLoading}
                    >
                        {cancelText}
                    </Button>
                    <Button 
                        variant="primary" 
                        className="flex-1"
                        onClick={onConfirm}
                        isLoading={isLoading}
                        disabled={isConfirmDisabled}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
