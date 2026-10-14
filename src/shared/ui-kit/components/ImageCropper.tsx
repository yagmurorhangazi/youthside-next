/**
 * @file ImageCropper.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

// @ts-nocheck
// Bu dosyada geçici olarak tip kontrolü kapalıdır; amaç önce eski davranışı bozmadan yorum ve izolasyon sınırlarını görünür yapmaktır.
// Sonraki teknik borç adımında API cevapları ve component props tipleri netleştirilerek bu satır kaldırılmalıdır.

import React, { useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
// [youthside-next eklemesi] verbatimModuleSyntax: tip importu `import type` olmalı (upstream'e önerilecek).
import Cropper, { type Area } from 'react-easy-crop';
import { Button } from '../primitives';
import { getCroppedImg } from '../utils/canvasUtils';
import { Check, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

/**
 * ImageCropperProps, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
export interface ImageCropperProps {
    imageSrc: string;
    onCropComplete: (file: Blob) => void;
    onCancel: () => void;
    aspect?: number;
    outputWidth?: number;
    outputHeight?: number;
}

/**
 * ImageCropper, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const ImageCropper: React.FC<ImageCropperProps> = ({ 
    imageSrc, 
    onCropComplete, 
    onCancel,
    aspect = 1, // Square by default
    outputWidth = 500, // Default output width
    outputHeight = 500 // Default output height
}) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [rotation, setRotation] = useState(0);

    /**
     * onCropChange, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop);
    };

    /**
     * onZoomChange, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    /**
     * onCropCompleteHandler, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const onCropCompleteHandler = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    /**
     * handleSave, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const handleSave = async () => {
        try {
            if (croppedAreaPixels) {
                const croppedImage = await getCroppedImg(
                    imageSrc, 
                    croppedAreaPixels, 
                    rotation, 
                    undefined, 
                    { width: outputWidth, height: outputHeight }
                );
                if (croppedImage) {
                    onCropComplete(croppedImage);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="relative h-[400px] w-full bg-slate-900">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        rotation={rotation}
                        onCropChange={onCropChange}
                        onCropComplete={onCropCompleteHandler}
                        onZoomChange={onZoomChange}
                        objectFit="contain"
                    />
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-slate-400 w-12 text-right">Zoom</span>
                        <ZoomOut size={16} className="text-slate-400" />
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                        />
                        <ZoomIn size={16} className="text-slate-400" />
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-slate-400 w-12 text-right">Rotasyon</span>
                        <input
                            type="range"
                            value={rotation}
                            min={0}
                            max={360}
                            step={1}
                            aria-labelledby="Rotation"
                            onChange={(e) => setRotation(Number(e.target.value))}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                        />
                         <RotateCcw 
                            size={16} 
                            className="text-slate-400 cursor-pointer hover:text-primary-600" 
                            onClick={() => setRotation(0)}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button variant="ghost" type="button" onClick={onCancel}>
                            İptal
                        </Button>
                        <Button variant="primary" type="button" onClick={handleSave} icon={Check}>
                            Kırp ve Kaydet
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
