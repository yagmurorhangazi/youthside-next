/**
 * @file GoogleMapsGuideModal.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

/**
 * [MODÜL: GOOGLE MAPS REHBER MODALI]
 * Amaç: Kullanıcıya Google Maps'ten iframe kodu nasıl alınır adım adım gösterir.
 * Mimar Notu: Bu bileşen Events ve CompanyProfile gibi birden fazla modülde
 *   kullanıldığı için paylaşılabilir (shared) bileşen olarak ayrıldı (DRY prensibi).
 */
import { createPortal } from 'react-dom';
import { MapPin } from 'lucide-react';
import { Button } from '../primitives';
import type { UiTerminology } from '../types';

/**
 * GoogleMapsGuideModalProps, ham veriyi component veya API tarafından beklenen daha temiz şekle dönüştürür.
 * Dönüştürme mantığını burada tutmak, render kodunun sadece ekrana veri basmasını sağlar.
 */
export interface GoogleMapsGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenMaps: () => void;
    /** Hesap türüne göre değişen metinler; verilmezse nötr varsayılan kullanılır. */
    terminology?: UiTerminology;
}

/**
 * GoogleMapsGuideModal, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const GoogleMapsGuideModal = ({ isOpen, onClose, onOpenMaps, terminology }: GoogleMapsGuideModalProps) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
                <div className="relative h-40 sm:h-48 bg-gradient-to-br from-indigo-600 via-primary-600 to-primary-500 p-6 sm:p-8 flex flex-col justify-center items-center text-center overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80')] opacity-10 bg-cover bg-center mix-blend-overlay" />
                    <div className="relative z-10 space-y-2">
                        <div className="mx-auto w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-2 shadow-inner border border-white/30">
                            <MapPin className="text-white" size={24} />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Harita Konumu Ekle</h2>
                        <p className="text-primary-100 font-medium text-sm">Katılımcıların sizi kolayca bulabilmesi için Google Maps kullanın.</p>
                    </div>
                </div>

                <div className="p-5 sm:p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center group cursor-pointer hover:bg-slate-50 p-4 rounded-2xl transition-colors">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-xl font-bold">1</span>
                            </div>
                            <h4 className="font-bold text-slate-800 mb-2">Konumunu Bul</h4>
                            <p className="text-xs text-slate-500 px-2 leading-relaxed">Google Maps'te {terminology?.possessiveLower ?? 'kurumunuzun'} veya ofisinizin konumunu bulun.</p>
                        </div>
                        <div className="text-center group cursor-pointer hover:bg-slate-50 p-4 rounded-2xl transition-colors">
                            <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-xl font-bold">2</span>
                            </div>
                            <h4 className="font-bold text-slate-800 mb-2">Paylaş & Yerleştir</h4>
                            <p className="text-xs text-slate-500 px-2 leading-relaxed">"Paylaş" butonuna tıklayın, ardından "Harita yerleştirme" sekmesine geçin.</p>
                        </div>
                        <div className="text-center group cursor-pointer hover:bg-slate-50 p-4 rounded-2xl transition-colors">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-xl font-bold">3</span>
                            </div>
                            <h4 className="font-bold text-slate-800 mb-2">HTML'i Kopyala</h4>
                            <p className="text-xs text-slate-500 px-2 leading-relaxed">"HTML'i Kopyala" butonuna basın ve formdaki alana yapıştırın.</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex gap-4 items-start">
                         <div className="shrink-0 mt-0.5">
                             <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
                                 <span className="text-xs font-bold text-primary-600">i</span>
                             </div>
                         </div>
                         <div className="space-y-1">
                             <p className="text-sm font-bold text-slate-800">İpucu: Otomatik Yapıştırma</p>
                             <p className="text-xs text-slate-500 leading-relaxed">
                                 Kodu kopyaladıktan sonra, formdaki adres alanına tıkladığınızda sistem otomatik olarak panonuzdaki kodu algılayıp yapıştıracaktır.
                             </p>
                         </div>
                    </div>

                    <div className="flex justify-center gap-4">
                        <Button variant='ghost' onClick={onClose} >
                            Vazgeç
                        </Button>
                        <Button 
                            onClick={onOpenMaps}
                            variant='outline'
                        >
                            <img 
                                src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Google_Maps_icon_%282020%29.svg/960px-Google_Maps_icon_%282020%29.svg.png" 
                                alt="Google Maps" 
                                className="w-6 h-6 object-contain"
                            />
                            <span>Google Maps'i Aç</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
        , document.body
    );
};
