/**
 * @file ErrorBoundary.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

// [youthside-next eklemesi] verbatimModuleSyntax: tip importu `import type` olmalı (upstream'e önerilecek).
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Card, CardContent } from '../primitives';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Props, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  scope?: string;
}

/**
 * State, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary, ortak UI bileşeni için durum ve davranışı aynı sorumluluk altında toplayan sınıftır.
 * Sınıf sınırı, çağıran componentlerin iç detayları bilmeden sadece public metotlara güvenmesini sağlar.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.scope || 'component'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
        if (this.props.fallback) {
            return this.props.fallback;
        }

        return (
            <Card className="border-red-100 bg-red-50/50 my-4">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="p-3 bg-red-100 rounded-full">
                        <AlertTriangle className="text-red-600" size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Bir Hata Oluştu</h3>
                        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                            Bu modül yüklenirken beklenmedik bir sorun yaşandı. 
                            Lütfen sayfayı yenileyin veya sorunu bildirin.
                        </p>
                    </div>
                    {this.state.error && (
                        <div className="bg-white p-2 rounded text-xs text-red-700 font-mono border border-red-100 max-w-full overflow-hidden">
                            {this.state.error.message}
                        </div>
                    )}
                    <button 
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <RefreshCw size={16} />
                        Sayfayı Yenile
                    </button>
                </CardContent>
            </Card>
        );
    }

    return this.props.children;
  }
}
