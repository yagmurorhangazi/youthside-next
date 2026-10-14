/**
 * @file PasswordConfirmModal.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import React from 'react';
import { Modal } from './Modal';
import { Button } from '../primitives';
import { ShieldAlert, Lock } from 'lucide-react';

/**
 * PasswordConfirmModalProps, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
export interface PasswordConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (password: string) => void;
    title?: string;
    description?: string;
    isLoading?: boolean;
}

/**
 * PasswordConfirmModal, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const PasswordConfirmModal: React.FC<PasswordConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Güvenlik Doğrulaması",
    description = "Bu işlemi gerçekleştirmek için lütfen şifrenizi giriniz.",
    isLoading = false
}) => {
    const [password, setPassword] = React.useState('');

    /**
     * handleSubmit, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password) {
            onConfirm(password);
        }
    };

    // Modal kapandığında şifreyi temizle
    React.useEffect(() => {
        if (!isOpen) {
            setPassword('');
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <div className="p-6">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert size={32} className="text-orange-600" />
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-2 text-center">
                    {title}
                </h3>
                
                <p className="text-slate-500 text-sm font-medium mb-6 text-center leading-relaxed">
                    {description}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Lock size={16} />
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all font-medium"
                            placeholder="Şifreniz"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button 
                            type="button"
                            variant="ghost" 
                            onClick={onClose}
                            className="flex-1"
                            disabled={isLoading}
                        >
                            İptal
                        </Button>
                        <Button 
                            type="submit"
                            variant="primary" 
                            className="flex-1"
                            disabled={!password || isLoading}
                            isLoading={isLoading}
                        >
                            Onayla
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};
