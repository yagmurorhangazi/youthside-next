/**
 * @file ImageDropzone.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

// @ts-nocheck
// Bu dosyada geçici olarak tip kontrolü kapalıdır; amaç önce eski davranışı bozmadan yorum ve izolasyon sınırlarını görünür yapmaktır.
// Sonraki teknik borç adımında API cevapları ve component props tipleri netleştirilerek bu satır kaldırılmalıdır.

import React, { useCallback } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { UploadCloud, X, Image as ImageIcon } from 'lucide-react';

/**
 * ImageDropzoneProps, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
export interface ImageDropzoneProps {
    value?: File | string | null;
    onChange: (file: File | null) => void;
    label?: string;
    error?: string;
    onError?: (message: string) => void;
    maxSizeMB?: number;
    disabled?: boolean;
}

/**
 * ImageDropzoneHandle, ortak UI bileşeni içinde kullanılan veri sözleşmesini tek yerde toplar.
 * Bu tipin ayrı tutulması, admin sayfasında aynı veriyi kullanan componentlerin birbirine gevşek bağlı kalmasını sağlar.
 */
export interface ImageDropzoneHandle {
    focus: () => void;
    click: () => void;
}

/**
 * ImageDropzone, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const ImageDropzone = React.forwardRef<ImageDropzoneHandle, ImageDropzoneProps>(({
    value, 
    onChange, 
    label, 
    error,
    onError,
    maxSizeMB = 3,
    disabled = false
}, ref) => {
    /**
     * onDrop, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (disabled) return;
        if (acceptedFiles?.[0]) {
            onChange(acceptedFiles[0]);
        }
    }, [disabled, onChange]);

    /**
     * onDropRejected, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
        const rejection = fileRejections[0];
        if (rejection) {
            const error = rejection.errors[0];
            if (error.code === 'file-too-large') {
                onError?.(`Dosya boyutu çok büyük. Maksimum ${maxSizeMB}MB yükleyebilirsiniz.`);
            } else if (error.code === 'file-invalid-type') {
                onError?.('Geçersiz dosya tipi. Sadece PNG, JPG ve WEBP yükleyebilirsiniz.');
            } else {
                onError?.(error.message || 'Dosya yüklenirken bir hata oluştu');
            }
        }
    }, [onError, maxSizeMB]);

    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => ({
        focus: () => {
             inputRef.current?.focus();
        },
        click: () => {
             inputRef.current?.click();
        }
    }));

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        onDropRejected,
        accept: {
            'image/jpeg': [],
            'image/png': [],
            'image/webp': []
        },
        maxSize: maxSizeMB * 1024 * 1024,
        multiple: false,
        disabled
    });

    const dropzoneInputProps = getInputProps();

    const previewUrl = typeof value === 'string' 
        ? value 
        : value instanceof File 
            ? URL.createObjectURL(value) 
            : null;

    const removeImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        onChange(null);
    };

    return (
        <div className="space-y-1.5 h-full flex flex-col">
            {label && <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>}
            
            <div 
                {...getRootProps()} 
                className={`
                    flex-1 relative border transition-all duration-200 rounded-2xl overflow-hidden min-h-[160px] flex items-center justify-center
                    ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                    ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100'}
                    ${error ? 'border-red-300' : ''}
                `}
            >
                <input 
                    {...dropzoneInputProps}
                    ref={(e) => {
                        // Merge refs: generic ref from dropzone and our local inputRef
                        const { ref: dropzoneRef } = dropzoneInputProps as { ref?: React.Ref<HTMLInputElement> };
                        if (typeof dropzoneRef === 'function') {
                             dropzoneRef(e);
                        } else if (dropzoneRef && 'current' in dropzoneRef) {
                             dropzoneRef.current = e;
                        }
                        inputRef.current = e;
                    }}
                />
                
                {previewUrl ? (
                    <div className="relative w-full h-full group">
                        <img 
                            src={previewUrl} 
                            alt="Preview" 
                            className="w-full h-full object-cover" 
                        />
                        {!disabled && (
                            <>
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="flex flex-col items-center text-white font-medium">
                                        <UploadCloud size={24} className="mb-2" />
                                        <span className="text-xs">Değiştirmek için tıkla</span>
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={removeImage}
                                    className="absolute top-2 right-2 p-1 bg-white/90 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-full shadow-sm transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="text-center p-6 transition-transform duration-200 hover:scale-105">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
                            <ImageIcon size={24} />
                        </div>
                        <p className="text-sm font-bold text-slate-600">
                            {isDragActive ? 'Buraya bırakın' : 'Görsel Yükle'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">veya tıklayıp seçin</p>
                        <p className="text-[10px] text-slate-300 mt-2 font-medium uppercase tracking-wide">
                            PNG, JPG, WEBP (Max {maxSizeMB}MB)
                        </p>
                    </div>
                )}
            </div>
            {error && <p className="text-[10px] font-bold text-red-500 ml-1">{error}</p>}
        </div>
    );
});
