/**
 * @file VideoDropzone.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import React, { useCallback } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { UploadCloud, X, Video, Loader2 } from 'lucide-react';

/**
 * VideoDropzoneProps, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
export interface VideoDropzoneProps {
    value?: string | null;
    onChange: (file: File | null) => void;
    label?: string;
    error?: string;
    onError?: (message: string) => void;
    maxSizeMB?: number;
    disabled?: boolean;
    uploading?: boolean;
    uploadingLabel?: string;
}

/**
 * VideoDropzone, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const VideoDropzone: React.FC<VideoDropzoneProps> = ({
    value,
    onChange,
    label,
    error,
    onError,
    maxSizeMB = 300,
    disabled = false,
    uploading = false,
    uploadingLabel = 'Video yükleniyor...'
}) => {
    /**
     * onDrop, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (disabled || uploading) return;
        if (acceptedFiles?.[0]) {
            onChange(acceptedFiles[0]);
        }
    }, [disabled, onChange, uploading]);

    /**
     * onDropRejected, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
        const rejection = fileRejections[0];
        if (!rejection) return;

        const dropError = rejection.errors?.[0];
        if (!dropError) return;

        if (dropError.code === 'file-too-large') {
            onError?.(`Video dosyası çok büyük. Maksimum ${maxSizeMB}MB yükleyebilirsiniz.`);
            return;
        }

        if (dropError.code === 'file-invalid-type') {
            onError?.('Geçersiz dosya tipi. Sadece MP4 yükleyebilirsiniz.');
            return;
        }

        onError?.(dropError.message || 'Video yüklenirken bir hata oluştu.');
    }, [maxSizeMB, onError]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        onDropRejected,
        accept: { 'video/mp4': ['.mp4'] },
        maxSize: maxSizeMB * 1024 * 1024,
        multiple: false,
        disabled: disabled || uploading
    });

    const removeVideo = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled || uploading) return;
        onChange(null);
    };

    return (
        <div className="space-y-1.5 h-full flex flex-col">
            {label && <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>}

            <div
                {...getRootProps()}
                className={`
                    flex-1 relative border transition-all duration-200 rounded-2xl overflow-hidden min-h-[180px] flex items-center justify-center
                    ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                    ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100'}
                    ${error ? 'border-red-300' : ''}
                `}
            >
                <input {...getInputProps()} />

                {value ? (
                    <div className="relative w-full h-full group">
                        <video src={value} controls className="w-full h-full object-contain bg-slate-900" />
                        {!disabled && !uploading && (
                            <>
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="flex flex-col items-center text-white font-medium">
                                        <UploadCloud size={24} className="mb-2" />
                                        <span className="text-xs">Değiştirmek için tıkla</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={removeVideo}
                                    className="absolute top-2 right-2 p-1 bg-white/90 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-full shadow-sm transition-colors"
                                    title="Videoyu kaldır"
                                >
                                    <X size={16} />
                                </button>
                            </>
                        )}
                        {uploading && (
                            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center">
                                <div className="flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-xs font-bold text-slate-700">
                                    <Loader2 size={14} className="animate-spin text-primary-600" />
                                    {uploadingLabel}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center p-6 transition-transform duration-200 hover:scale-105">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
                            {uploading ? <Loader2 size={24} className="animate-spin text-primary-500" /> : <Video size={24} />}
                        </div>
                        <p className="text-sm font-bold text-slate-600">
                            {uploading ? uploadingLabel : isDragActive ? 'Buraya bırakın' : 'MP4 Video Yükle'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">sürükle-bırak veya tıklayıp seç</p>
                        <p className="text-[10px] text-slate-300 mt-2 font-medium uppercase tracking-wide">
                            MP4 (Max {maxSizeMB}MB)
                        </p>
                    </div>
                )}
            </div>
            {error && <p className="text-[10px] font-bold text-red-500 ml-1">{error}</p>}
        </div>
    );
};
