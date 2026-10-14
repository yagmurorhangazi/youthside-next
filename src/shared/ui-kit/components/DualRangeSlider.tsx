/**
 * @file DualRangeSlider.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';

/**
 * [MODÜL: DUAL RANGE SLIDER]
 * Amaç: Min-Max aralığı seçimi için çift başlıklı (dual-thumb) slider bileşeni.
 * Mimar Notu: CSS-only yaklaşım ile performans korundu, DOM manipulation yerine
 * React state kullanılarak re-render optimizasyonu sağlandı.
 */

export interface DualRangeSliderProps {
    min: number;
    max: number;
    step?: number;
    minValue?: number;
    maxValue?: number;
    onChange: (min: number | undefined, max: number | undefined) => void;
    label: string;
    /** Thumb ve değer gösteriminde kullanılacak biçimlendirici */
    formatValue?: (value: number) => string;
    /** Slider renk tonu (tailwind renk adı) */
    color?: 'primary' | 'amber' | 'emerald' | 'violet';
    /** Ayrık adımlar için etiketler (ör: yıldız puanları) */
    marks?: { value: number; label: string }[];
    /** Track üzerinde ikon gösterimi */
    icon?: React.ElementType;
}

/**
 * DualRangeSlider, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
    min,
    max,
    step = 1,
    minValue,
    maxValue,
    onChange,
    label,
    formatValue = (v) => String(v),
    color = 'primary',
    marks,
    icon: Icon
}) => {
    // Aktif (seçilmiş) değerler — undefined ise slider sınır değerlerini kullan
    const activeMin = minValue ?? min;
    const activeMax = maxValue ?? max;
    
    const trackRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState<'min' | 'max' | null>(null);

    // Renk paleti eşleştirmesi
    const colorMap = {
        primary: {
            track: 'bg-primary-500',
            thumb: 'bg-primary-600 border-primary-300 shadow-primary-500/30',
            label: 'text-primary-700 bg-primary-50',
            hover: 'hover:bg-primary-100',
            fill: 'from-primary-400 to-primary-600'
        },
        amber: {
            track: 'bg-amber-500',
            thumb: 'bg-amber-500 border-amber-300 shadow-amber-500/30',
            label: 'text-amber-700 bg-amber-50',
            hover: 'hover:bg-amber-100',
            fill: 'from-amber-400 to-amber-500'
        },
        emerald: {
            track: 'bg-emerald-500',
            thumb: 'bg-emerald-600 border-emerald-300 shadow-emerald-500/30',
            label: 'text-emerald-700 bg-emerald-50',
            hover: 'hover:bg-emerald-100',
            fill: 'from-emerald-400 to-emerald-600'
        },
        violet: {
            track: 'bg-violet-500',
            thumb: 'bg-violet-600 border-violet-300 shadow-violet-500/30',
            label: 'text-violet-700 bg-violet-50',
            hover: 'hover:bg-violet-100',
            fill: 'from-violet-400 to-violet-600'
        }
    };

    const colors = colorMap[color];

    // Yüzdelik hesaplama
    const getPercent = useCallback((value: number) => {
        return ((value - min) / (max - min)) * 100;
    }, [min, max]);

    // Track tıklama/drag ile değer hesaplama
    const getValueFromPosition = useCallback((clientX: number) => {
        if (!trackRef.current) return min;
        const rect = trackRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const rawValue = min + percent * (max - min);
        // Step'e yuvarla
        const snapped = Math.round(rawValue / step) * step;
        return Math.max(min, Math.min(max, snapped));
    }, [min, max, step]);

    // Mouse/Touch event handler'ları
    const handlePointerDown = useCallback((thumb: 'min' | 'max') => (e: React.PointerEvent) => {
        e.preventDefault();
        setDragging(thumb);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, []);

    /**
     * handlePointerMove, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!dragging) return;
        const newVal = getValueFromPosition(e.clientX);
        
        if (dragging === 'min') {
            // Min thumb: max değerini aşamaz
            const clampedMin = Math.min(newVal, activeMax);
            const resultMin = clampedMin <= min ? undefined : clampedMin;
            const resultMax = activeMax >= max ? undefined : activeMax;
            onChange(resultMin, resultMax);
        } else {
            // Max thumb: min değerinin altına inemez
            const clampedMax = Math.max(newVal, activeMin);
            const resultMin = activeMin <= min ? undefined : activeMin;
            const resultMax = clampedMax >= max ? undefined : clampedMax;
            onChange(resultMin, resultMax);
        }
    }, [dragging, activeMin, activeMax, min, max, getValueFromPosition, onChange]);

    /**
     * handlePointerUp, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const handlePointerUp = useCallback(() => {
        setDragging(null);
    }, []);

    // Track'e tıklayınca en yakın thumb'u taşı
    const handleTrackClick = useCallback((e: React.MouseEvent) => {
        const val = getValueFromPosition(e.clientX);
        const distToMin = Math.abs(val - activeMin);
        const distToMax = Math.abs(val - activeMax);

        if (distToMin <= distToMax) {
            const resultMin = val <= min ? undefined : val;
            const resultMax = activeMax >= max ? undefined : activeMax;
            onChange(resultMin, resultMax);
        } else {
            const resultMin = activeMin <= min ? undefined : activeMin;
            const resultMax = val >= max ? undefined : val;
            onChange(resultMin, resultMax);
        }
    }, [activeMin, activeMax, min, max, getValueFromPosition, onChange]);

    // Aralık sıfırlama
    const isFiltered = minValue !== undefined || maxValue !== undefined;

    const leftPercent = getPercent(activeMin);
    const rightPercent = getPercent(activeMax);

    return (
        <div className="space-y-3">
            {/* Başlık + Seçilen Aralık */}
            <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {label}
                </label>
                {isFiltered && (
                    <button 
                        onClick={() => onChange(undefined, undefined)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.label} transition-colors ${colors.hover}`}
                    >
                        {formatValue(activeMin)} — {formatValue(activeMax)} ✕
                    </button>
                )}
            </div>

            {/* Slider Track */}
            <div className="px-2 pt-1 pb-2">
                <div
                    ref={trackRef}
                    className="relative h-2 bg-slate-100 rounded-full cursor-pointer select-none"
                    onClick={handleTrackClick}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                >
                    {/* Seçili aralık (dolu kısım) */}
                    <div
                        className={`absolute h-full rounded-full bg-gradient-to-r ${colors.fill} transition-none`}
                        style={{
                            left: `${leftPercent}%`,
                            width: `${rightPercent - leftPercent}%`
                        }}
                    />

                    {/* Min Thumb */}
                    <div
                        className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white ${colors.thumb} shadow-lg cursor-grab active:cursor-grabbing active:scale-110 transition-transform z-10 ${dragging === 'min' ? 'scale-110' : ''}`}
                        style={{ left: `calc(${leftPercent}% - 10px)` }}
                        onPointerDown={handlePointerDown('min')}
                    >
                        {/* Değer tooltip — drag sırasında göster */}
                        {dragging === 'min' && (
                            <div className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap ${colors.label} shadow-sm`}>
                                {formatValue(activeMin)}
                            </div>
                        )}
                    </div>

                    {/* Max Thumb */}
                    <div
                        className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white ${colors.thumb} shadow-lg cursor-grab active:cursor-grabbing active:scale-110 transition-transform z-10 ${dragging === 'max' ? 'scale-110' : ''}`}
                        style={{ left: `calc(${rightPercent}% - 10px)` }}
                        onPointerDown={handlePointerDown('max')}
                    >
                        {dragging === 'max' && (
                            <div className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap ${colors.label} shadow-sm`}>
                                {formatValue(activeMax)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Alt etiketler (marks veya min/max) */}
                {marks ? (
                    <div className="relative mt-2">
                        {marks.map(mark => (
                            <span
                                key={mark.value}
                                className="absolute text-[9px] font-bold text-slate-400 -translate-x-1/2"
                                style={{ left: `${getPercent(mark.value)}%` }}
                            >
                                {mark.label}
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="flex justify-between mt-1.5">
                        <span className="text-[10px] font-bold text-slate-400">{formatValue(min)}</span>
                        <span className="text-[10px] font-bold text-slate-400">{formatValue(max)}</span>
                    </div>
                )}
            </div>

            {/* Seçili aralık bilgi kutusu */}
            {isFiltered && (
                <div className={`text-[10px] font-bold px-3 py-1.5 rounded-lg text-center ${colors.label}`}>
                    {Icon && <Icon size={12} className="inline mr-1" />}
                    {formatValue(activeMin)} — {formatValue(activeMax)} arası gösterilecek
                </div>
            )}
        </div>
    );
};
