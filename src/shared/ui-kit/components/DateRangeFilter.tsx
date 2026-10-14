/**
 * @file DateRangeFilter.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    format, 
    addDays, 
    startOfWeek, 
    endOfWeek, 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval, 
    isSameMonth, 
    isSameDay, 
    isToday,
    subDays,
    startOfDay,
    endOfDay,
    isWithinInterval,
    subMonths
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '../primitives';

/**
 * DateRange, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
interface DateRange {
    start: Date | null;
    end: Date | null;
}

/**
 * DateRangeFilterProps, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
export interface DateRangeFilterProps {
    onChange: (range: DateRange) => void;
    initialRange?: DateRange;
    align?: 'left' | 'right';
    className?: string; // Add className prop
}

/**
 * PRESETS, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
const PRESETS = [
    { label: 'Tüm Zamanlar', getValue: () => ({ start: null, end: null }) },
    { label: 'Bugün', getValue: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }) },
    { label: 'Dün', getValue: () => ({ start: startOfDay(subDays(new Date(), 1)), end: endOfDay(subDays(new Date(), 1)) }) },
    { label: 'Bu Hafta', getValue: () => ({ start: startOfWeek(new Date(), { locale: tr }), end: new Date() }) }, // Haftanın başından bugüne
    { label: 'Son 1 Ay', getValue: () => ({ start: subMonths(new Date(), 1), end: new Date() }) },
    { label: 'Bu Ay', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
];

/**
 * DateRangeFilter, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ onChange, initialRange, align = 'right', className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [range, setRange] = useState<DateRange>(initialRange || { start: null, end: null });
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        /**
         * handleClickOutside, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
         * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
         */
        const handleClickOutside = (event: MouseEvent) => {
            // Mobilde panel body'ye portal'lanır (containerRef dışında) ve kapanma
            // overlay + Escape ile yönetilir; bu yüzden click-outside yalnızca masaüstünde çalışır.
            if (window.innerWidth < 768) return;
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Mobil bottom-sheet açıkken Escape ile kapat
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    /**
     * handleDayClick, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const handleDayClick = (day: Date) => {
        if (!range.start || (range.start && range.end)) {
            // Start new selection
            setRange({ start: day, end: null });
        } else {
            // Complete selection
            if (day < range.start) {
                setRange({ start: day, end: range.start });
            } else {
                setRange({ start: range.start, end: day });
            }
        }
    };

    /**
     * handleApply, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const handleApply = () => {
        onChange(range);
        setIsOpen(false);
    };

    /**
     * handlePresetClick, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const handlePresetClick = (preset: typeof PRESETS[0]) => {
        const newRange = preset.getValue();
        setRange(newRange);
        // Optional: Auto apply or keep open? Let's keep open to see selection, or auto-apply?
        // User request implies immediate feedback but usually Apply button is safer.
        // Let's update internal state, user must click Apply.
        // Actually, for presets usually it's nice to just set it.
        // But let's stick to the "Uygula" flow for consistency, or maybe update currentMonth to show selection.
        if (newRange.start) {
            setCurrentMonth(newRange.start);
        }
    };

    // Calendar Grid Generation
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: tr });
    const endDate = endOfWeek(monthEnd, { locale: tr });

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const isSelected = (day: Date) => {
        if (!range.start) return false;
        if (range.end) {
            return isWithinInterval(day, { start: range.start, end: range.end });
        }
        return isSameDay(day, range.start);
    };

    const isRangeStart = (day: Date) => range.start && isSameDay(day, range.start);
    const isRangeEnd = (day: Date) => range.end && isSameDay(day, range.end);
    const isInRange = (day: Date) => range.start && range.end && isWithinInterval(day, { start: range.start, end: range.end });

    // Mobil hızlı seçim butonunun aktif olup olmadığını mevcut aralığa göre belirler
    const isPresetActive = (preset: typeof PRESETS[0]) => {
        const value = preset.getValue();
        const match = (a: Date | null, b: Date | null) =>
            (a === null && b === null) || (!!a && !!b && isSameDay(a, b));
        return match(value.start, range.start) && match(value.end, range.end);
    };

    // Format display text
    const getDisplayText = () => {
        if (!range.start && !range.end) return 'Tarih';
        if (range.start && !range.end) return format(range.start, 'd MMM', { locale: tr });
        if (range.start && range.end) {
            if (isSameDay(range.start, range.end)) return format(range.start, 'd MMM', { locale: tr });
            return `${format(range.start, 'd MMM', { locale: tr })} - ${format(range.end, 'd MMM', { locale: tr })}`;
        }
        return 'Tarih';
    };

    const hasActiveFilter = !!(range.start || range.end);

    return (
        <div className={`relative ${className || ''}`} ref={containerRef}>
            <Button 
                variant={hasActiveFilter ? 'primary' : 'ghost'} 
                icon={CalendarIcon} 
                onClick={() => setIsOpen(!isOpen)}
                className={hasActiveFilter ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/20 border-transparent' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
            >
                {getDisplayText()}
            </Button>

            {/* Masaüstü: popover (mobilde gizli — onun yerine bottom-sheet açılır) */}
            {isOpen && (
                <div className={`absolute top-full mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 p-0 z-50 hidden md:flex md:flex-row overflow-hidden min-w-[320px] md:min-w-[500px] animate-in fade-in zoom-in-95 duration-200 origin-top-right ${align === 'left' ? 'left-0' : 'right-0'}`}>
                    
                    {/* Left Pane: Presets */}
                    <div className="w-full md:w-48 bg-slate-50 p-4 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col gap-2">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 px-2">Hızlı Seçim</p>
                        {PRESETS.map((preset, idx) => (
                            <button
                                key={idx}
                                onClick={() => handlePresetClick(preset)}
                                className="text-left px-3 py-2 text-sm font-bold text-slate-600 hover:bg-white hover:text-primary-600 hover:shadow-sm rounded-xl transition-all"
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    {/* Right Pane: Calendar */}
                    <div className="flex-1 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <button onClick={() => setCurrentMonth(subDays(monthStart, 1))} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <ChevronLeft size={20} />
                            </button>
                            <span className="text-sm font-black text-slate-800 uppercase tracking-wide">
                                {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                            </span>
                            <button onClick={() => setCurrentMonth(addDays(monthEnd, 1))} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 mb-2">
                            {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(day => (
                                <div key={day} className="text-center text-xs font-bold text-slate-300 py-1">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((day, idx) => {
                                const isCurrentMonth = isSameMonth(day, currentMonth);
                                const isTodayDate = isToday(day);
                                const start = isRangeStart(day);
                                const end = isRangeEnd(day);
                                const inRange = isInRange(day);

                                let bgClass = 'hover:bg-slate-50 text-slate-700';
                                if (!isCurrentMonth) bgClass = 'text-slate-300';
                                if (inRange) bgClass = 'bg-primary-50 text-primary-700 font-bold';
                                if (start || end) bgClass = 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 font-bold z-10';
                                if (!start && !end && inRange) bgClass = 'bg-primary-50 text-primary-700 z-0';

                                // Rounding for range visuals
                                let roundedClass = 'rounded-lg';
                                if (start && range.end) roundedClass = 'rounded-l-lg rounded-r-none';
                                if (end && range.start) roundedClass = 'rounded-r-lg rounded-l-none';
                                if (inRange && !start && !end) roundedClass = 'rounded-none';

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleDayClick(day)}
                                        className={`
                                            h-9 flex items-center justify-center text-xs font-bold transition-all relative
                                            ${bgClass}
                                            ${roundedClass}
                                        `}
                                    >
                                        {format(day, 'd')}
                                        {isTodayDate && !start && !end && !inRange && (
                                            <div className="absolute bottom-1.5 w-1 h-1 bg-primary-500 rounded-full" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-50">
                            <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)}>İptal</Button>
                            <Button size="sm" variant="primary" onClick={handleApply}>Uygula</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobil: bottom-sheet drawer (masaüstünde gizli).
               Portal ile body'ye render edilir — transformlu atalar (örn. animate-fade-in)
               position:fixed'i bozup paneli ekran dışına itmesin diye. */}
            {isOpen && createPortal(
                <div className="fixed inset-0 z-[90] md:hidden">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-950/35"
                        onClick={() => setIsOpen(false)}
                        aria-label="Tarih seçimini kapat"
                    />

                    <section className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-[28px] border border-slate-100 bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
                            <div className="min-w-0">
                                <h2 className="text-lg font-black text-slate-900">Tarih Aralığı</h2>
                                <p className="mt-1 text-xs font-medium text-slate-400">Hızlı seçim yapın veya takvimden aralık belirleyin.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                                aria-label="Kapat"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="px-4 py-4">
                            {/* Hızlı seçim */}
                            <div className="grid grid-cols-2 gap-2">
                                {PRESETS.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handlePresetClick(preset)}
                                        className={`rounded-2xl px-3 py-3 text-sm font-bold transition-all ${
                                            isPresetActive(preset)
                                                ? 'bg-primary-600 text-white shadow-md'
                                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>

                            {/* Takvim */}
                            <div className="mt-5 rounded-2xl border border-slate-100 p-4">
                                <div className="mb-4 flex items-center justify-between">
                                    <button onClick={() => setCurrentMonth(subDays(monthStart, 1))} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><ChevronLeft size={20} /></button>
                                    <h3 className="text-base font-black uppercase tracking-wide text-slate-800">
                                        {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                                    </h3>
                                    <button onClick={() => setCurrentMonth(addDays(monthEnd, 1))} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><ChevronRight size={20} /></button>
                                </div>

                                <div className="mb-2 grid grid-cols-7 text-center">
                                    {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((d) => (
                                        <div key={d} className="py-1 text-xs font-bold text-slate-400">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center">
                                    {calendarDays.map((day, idx) => {
                                        const isCurrentMonth = isSameMonth(day, currentMonth);
                                        const start = isRangeStart(day);
                                        const end = isRangeEnd(day);
                                        const inRange = isInRange(day);
                                        const isTodayDate = isToday(day);

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => { if (isCurrentMonth) handleDayClick(day); }}
                                                className={`
                                                    mx-auto flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold transition-all
                                                    ${!isCurrentMonth ? 'cursor-default text-slate-200' : 'cursor-pointer hover:bg-primary-50'}
                                                    ${start || end ? '!bg-primary-600 !text-white !shadow-md' : ''}
                                                    ${inRange && !start && !end ? 'bg-primary-50 text-primary-700' : ''}
                                                    ${isTodayDate && !start && !end && !inRange ? 'text-primary-600 ring-1 ring-inset ring-primary-200' : ''}
                                                    ${!start && !end && !inRange && isCurrentMonth ? 'text-slate-700' : ''}
                                                `}
                                            >
                                                {format(day, 'd')}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white px-4 py-4 pb-8">
                            <Button variant="ghost" className="flex-1 justify-center" onClick={() => setIsOpen(false)}>İptal</Button>
                            <Button variant="primary" className="flex-1 justify-center" onClick={handleApply}>Uygula</Button>
                        </div>
                    </section>
                </div>,
                document.body,
            )}
        </div>
    );
};
