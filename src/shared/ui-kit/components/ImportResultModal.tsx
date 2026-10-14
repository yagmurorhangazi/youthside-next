/**
 * @file ImportResultModal.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

// @ts-nocheck
// Bu dosyada geçici olarak tip kontrolü kapalıdır; amaç önce eski davranışı bozmadan yorum ve izolasyon sınırlarını görünür yapmaktır.
// Sonraki teknik borç adımında API cevapları ve component props tipleri netleştirilerek bu satır kaldırılmalıdır.

import React from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Download, Check } from 'lucide-react';
import { Button } from '../primitives';
import * as XLSX from 'xlsx';

/**
 * ImportResultModalProps, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
export interface ImportResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    results: {
        total: number;
        success: number;
        failed: number;
        skipped: number;
        skipped_details?: Array<{
            name?: string;
            email?: string;
            phone?: string;
            reason: string;
        }>;
        errors?: string[];
    } | null;
}

/**
 * ImportResultModal, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const ImportResultModal = ({ isOpen, onClose, results }: ImportResultModalProps) => {
    if (!isOpen || !results) return null;

    const { success, skipped, failed } = results;
    // Tam başarı durumu: Hiç hata ve atlanan yoksa
    const isPerfect = skipped === 0 && failed === 0;

    /**
     * handleDownloadReport, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const handleDownloadReport = () => {
        const data = [];
        
        if (results.skipped_details) {
            results.skipped_details.forEach(item => {
                data.push({
                    'Durum': 'ATLANDI',
                    'Ad Soyad': item.name || '-',
                    'Email': item.email || '-',
                    'Telefon': item.phone || '-',
                    'Sebep': item.reason
                });
            });
        }
        
        if (results.errors) {
            results.errors.forEach(err => {
                data.push({
                    'Durum': 'HATA',
                    'Ad Soyad': '-',
                    'Email': '-',
                    'Telefon': '-',
                    'Sebep': err
                });
            });
        }

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "İçe Aktarım Raporu");
        XLSX.writeFile(wb, "import_sonuc_raporu.xlsx");
    };

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] animate-in fade-in duration-200" onClick={onClose} />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-[32px] shadow-2xl z-[70] p-8 animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">
                
                {/* Header with Close Button */}
                <div className="w-full flex justify-between items-center mb-6 absolute top-6 px-8 left-0">
                    <h3 className="text-lg font-bold text-slate-800">İşlem Sonucu</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                {/* Spacing for absolute header */}
                <div className="h-8 w-full"></div>

                {isPerfect ? (
                    // 1. TAM BAŞARI DURUMU
                    <div className="flex flex-col items-center w-full">
                        <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50/50">
                            <Check size={48} strokeWidth={3} />
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 mb-2">İşlem Başarılı</h4>
                        <p className="text-slate-500 mb-8 max-w-[200px]">
                            Tüm kayıtlar başarıyla sisteme eklendi.
                        </p>
                        <Button variant="primary" className="w-full h-12 text-base rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200" onClick={onClose}>
                            Tamam
                        </Button>
                    </div>
                ) : (
                    // 2. KARIŞIK / HATALI DURUM
                    <div className="flex flex-col items-center w-full">
                         {/* Icon */}
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ring-8 ${failed > 0 ? 'bg-red-50 text-red-500 ring-red-50/50' : 'bg-orange-50 text-orange-500 ring-orange-50/50'}`}>
                            <AlertTriangle size={40} strokeWidth={2.5} />
                        </div>

                        {/* Stats Grid - Sadece 0'dan büyük olanları göster */}
                        <div className="flex flex-wrap justify-center gap-3 w-full mb-6">
                            {success > 0 && (
                                <div className="flex-1 min-w-[30%] bg-emerald-50 py-3 px-2 rounded-2xl flex flex-col items-center border border-emerald-100/50">
                                    <span className="text-emerald-700 text-[10px] font-bold uppercase tracking-wider mb-0.5">BAŞARILI</span>
                                    <span className="text-xl font-black text-emerald-600">{success}</span>
                                </div>
                            )}
                            
                            {skipped > 0 && (
                                <div className="flex-1 min-w-[30%] bg-orange-50 py-3 px-2 rounded-2xl flex flex-col items-center border border-orange-100/50">
                                    <span className="text-orange-700 text-[10px] font-bold uppercase tracking-wider mb-0.5">ATLANAN</span>
                                    <span className="text-xl font-black text-orange-600">{skipped}</span>
                                </div>
                            )}

                            {failed > 0 && (
                                <div className="flex-1 min-w-[30%] bg-red-50 py-3 px-2 rounded-2xl flex flex-col items-center border border-red-100/50">
                                    <span className="text-red-700 text-[10px] font-bold uppercase tracking-wider mb-0.5">HATALI</span>
                                    <span className="text-xl font-black text-red-600">{failed}</span>
                                </div>
                            )}
                        </div>

                        {/* Explanation Text */}
                        <div className="bg-slate-50 p-4 rounded-xl w-full mb-6 text-left">
                            {skipped > 0 && (
                                <div className="text-sm text-slate-600 mb-2 last:mb-0 flex gap-2">
                                    <span className="text-orange-500 font-bold">•</span>
                                    <span>Atlanan {skipped} kayıt sistemde zaten mevcuttur.</span>
                                </div>
                            )}
                            {failed > 0 && (
                                <div className="text-sm text-slate-600 flex gap-2">
                                    <span className="text-red-500 font-bold">•</span>
                                    <span>{failed} kayıt hatalı format nedeniyle işlenemedi.</span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="w-full flex flex-col gap-3">
                            <Button 
                                variant="primary" 
                                className={`w-full h-12 text-base rounded-2xl shadow-xl ${failed > 0 ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'}`}
                                onClick={onClose}
                            >
                                Tamam
                            </Button>
                            
                            <button 
                                onClick={handleDownloadReport}
                                className="flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 text-sm font-medium py-2 transition-colors"
                            >
                                <Download size={16} />
                                Detaylı Rapor İndir
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
