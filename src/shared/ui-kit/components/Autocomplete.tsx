/**
 * @file Autocomplete.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, ChevronsUpDown, Plus, X, Loader2 } from 'lucide-react';
// [youthside-next eklemesi] verbatimModuleSyntax: tip importu `import type` olmalı (upstream'e önerilecek).
import type { LucideIcon } from 'lucide-react';

/**
 * Seçenekler `value` ve `label` dışında domain'e özgü alanlar taşıyabilir
 * (id, slug, count vs.) ve bunlar `renderOption` ile kullanılır.
 *
 * İndeks imzası bilinçli olarak `any`: `unknown` yapılırsa interface olarak
 * tanımlanmış çağıran tipler atanamaz hâle gelir — TypeScript implicit index
 * signature'ı yalnızca type alias'lara verir, interface'lere vermez.
 */
export type AutocompleteOption = { value: string; label: string; [key: string]: any };

/**
 * AutocompleteProps, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
export interface AutocompleteProps {
    options: AutocompleteOption[] | string[];
    value?: string | string[];
    onChange: (value: string | string[], option?: AutocompleteOption | AutocompleteOption[]) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    allowCustom?: boolean;
    disabled?: boolean;
    className?: string;
    icon?: LucideIcon;
    multiple?: boolean;
    searchable?: boolean;
    placement?: 'top' | 'bottom';
    renderOption?: (option: AutocompleteOption, isSelected: boolean) => React.ReactNode;
    loading?: boolean;
    onSearchChange?: (query: string) => void;
    onBlur?: () => void;
}

/**
 * Highlights the search term within the text, bolding the matched part.
 * Handles Turkish character casing correctly.
 */
const HighlightedText = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight || !highlight.trim()) {
        return <span className="text-slate-700 font-medium">{text}</span>;
    }

    const unaccentedText = text.toLocaleLowerCase('tr-TR');
    const unaccentedHighlight = highlight.toLocaleLowerCase('tr-TR');
    
    const index = unaccentedText.indexOf(unaccentedHighlight);

    if (index === -1) {
        return <span className="text-slate-700 font-medium">{text}</span>;
    }

    const before = text.substring(0, index);
    const match = text.substring(index, index + highlight.length);
    const after = text.substring(index + highlight.length);

    return (
        <span className="text-slate-700 font-medium">
            {before}
            <span className="font-black text-slate-900 bg-yellow-100/50 rounded-sm px-0.5">{match}</span>
            {after}
        </span>
    );
};

/**
 * Autocomplete, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const Autocomplete = React.forwardRef<HTMLInputElement, AutocompleteProps>(({
    options = [],
    value,
    onChange,
    placeholder = "Seçiniz...",
    label,
    error,
    allowCustom = false,
    disabled = false,
    className = '',
    icon: Icon,
    multiple = false,
    searchable = true,
    placement = 'bottom',
    renderOption,
    loading = false,
    onSearchChange,
    onBlur
}, ref) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);
    const internalInputRef = useRef<HTMLInputElement>(null);
    const dropdownListRef = useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => internalInputRef.current as HTMLInputElement);

    const [customOptions, setCustomOptions] = useState<AutocompleteOption[]>([]);

    /**
     * normalizedOptions, render sırasında tekrar hesaplanması pahalı veya gereksiz olan veriyi sabitler.
     * Bu memo sınırı, parent render olduğunda aynı girdiyle aynı sonucu kullanarak liste ve kart ekranlarını rahatlatır.
     */
    const normalizedOptions = useMemo(() => {
        return options.map(opt => 
            typeof opt === 'string' ? { value: opt, label: opt } : opt
        );
    }, [options]);

    /**
     * allOptions, render sırasında tekrar hesaplanması pahalı veya gereksiz olan veriyi sabitler.
     * Bu memo sınırı, parent render olduğunda aynı girdiyle aynı sonucu kullanarak liste ve kart ekranlarını rahatlatır.
     */
    const allOptions = useMemo(() => {
        const existingValues = new Set(normalizedOptions.map(o => o.value));
        const filteredCustom = customOptions.filter(c => !existingValues.has(c.value));
        return [...normalizedOptions, ...filteredCustom];
    }, [normalizedOptions, customOptions]);

    /**
     * selectedValues, render sırasında tekrar hesaplanması pahalı veya gereksiz olan veriyi sabitler.
     * Bu memo sınırı, parent render olduğunda aynı girdiyle aynı sonucu kullanarak liste ve kart ekranlarını rahatlatır.
     */
    const selectedValues = useMemo(() => {
        if (Array.isArray(value)) return value;
        if (value) return [value];
        return [];
    }, [value]);

    // Update query when value changes programmatically (single select)
    useEffect(() => {
        if (!open && !multiple) {
            const selected = allOptions.find(o => o.value === value);
            if (selected) {
                 setQuery(selected.label);
            } else if (allowCustom && typeof value === 'string' && value) {
                 // If allowCustom is true, and value is not in options, assume it's custom text
                 setQuery(value);
            } else {
                setQuery("");
            }
        }
    }, [open, value, allOptions, allowCustom, multiple]);

    useEffect(() => {
        /**
         * handleClickOutside, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
         * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
         */
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
                
                // Auto-commit typed custom text if not selected and allowCustom is true
                if (allowCustom && !multiple && query.trim() && query !== value) {
                    const exactMatch = allOptions.find(o => o.label.toLocaleLowerCase('tr-TR') === query.toLocaleLowerCase('tr-TR'));
                    if (exactMatch) {
                        onChange(exactMatch.value, exactMatch);
                    } else {
                        onChange(query.trim(), { value: query.trim(), label: query.trim() });
                    }
                } else {
                    if (!multiple) {
                        const selected = allOptions.find(o => o.value === value);
                        if (selected) {
                            setQuery(selected.label);
                        } else if (allowCustom && typeof value === 'string' && value) {
                            setQuery(value);
                        } else {
                            setQuery("");
                        }
                    } else {
                        setQuery("");
                    }
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [value, allOptions, allowCustom, multiple, query, onChange]);

    /**
     * filteredOptions, render sırasında tekrar hesaplanması pahalı veya gereksiz olan veriyi sabitler.
     * Bu memo sınırı, parent render olduğunda aynı girdiyle aynı sonucu kullanarak liste ve kart ekranlarını rahatlatır.
     */
    const filteredOptions = useMemo(() => {
        // If onSearchChange is provided, we assume external filtering (Async)
        // We shouldn't filter locally effectively, or at least be careful.
        // But usually, the parent passes 'options' which ARE the filtered results.
        // So we should just return them as is.
        if (onSearchChange) return allOptions;
        
        if (!searchable) return allOptions;
        if (!query) return allOptions;
        
        return allOptions.filter((option) =>
            option.label.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'))
        );
    }, [allOptions, query, searchable, onSearchChange]);

    /**
     * handleSelect, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const handleSelect = (option: AutocompleteOption) => {
        if (multiple) {
            const current = selectedValues;
            const exists = current.includes(option.value);
            let newValue;
            
            if (exists) {
                newValue = current.filter(v => v !== option.value);
            } else {
                newValue = [...current, option.value];
            }
            const selectedOptions = allOptions.filter(o => newValue.includes(o.value));
            onChange(newValue, selectedOptions);
            
            setQuery(""); 
            internalInputRef.current?.focus(); 
        } else {
            onChange(option.value, option);
            setQuery(option.label);
            setOpen(false);
        }
    };

    /**
     * handleCustomAdd, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const handleCustomAdd = () => {
        if (allowCustom && query.trim()) {
            const newVal = query.trim();
            const newOption = { value: newVal, label: newVal };
            
            setCustomOptions(prev => [...prev, newOption]);
            
            if (multiple) {
                onChange([...selectedValues, newVal], [newOption]); 
                setQuery("");
            } else {
                onChange(newVal, newOption);
                setOpen(false);
            }
        }
    };

    const removeTag = (valToRemove: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newValue = selectedValues.filter(v => v !== valToRemove);
        onChange(newValue);
    };

    // Büyük option listelerinde dropdown DOM freeze'ini önlemek için virtualization
    const dropdownVirtualizer = useVirtualizer({
      count: filteredOptions.length,
      getScrollElement: () => dropdownListRef.current,
      estimateSize: () => 42,
      overscan: 5,
    });

    // If onSearchChange is provided, we assume external filtering, so "Exact Match" check might differ.
    // But usually we check against available filteredOptions.
    const exactMatch = filteredOptions.some(
        opt => opt.label.toLocaleLowerCase('tr-TR') === query.toLocaleLowerCase('tr-TR')
    );

    // Show "Add Option" if:
    // 1. allowCustom is true
    // 2. Query is not empty
    // 3. No exact match found
    // 4. Not loading
    const showAddOption = allowCustom && query.trim().length > 0 && !exactMatch && !loading;

    return (
        <div className={`w-full space-y-1.5 ${className}`} ref={wrapperRef}>
            {label && <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>}
            
            <div 
                className={`
                    relative group rounded-2xl px-4 py-2 transition-all duration-200 border
                    ${error ? 'border-red-500 bg-red-50/50' : 'bg-slate-50/50 border-slate-200/60'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    focus-within:ring-4 focus-within:ring-primary-500/5 focus-within:border-primary-400 focus-within:bg-white
                    flex flex-wrap items-center gap-2 min-h-[48px]
                `}
                onClick={() => {
                    if (!disabled) {
                        internalInputRef.current?.focus();
                        setOpen(true);
                    }
                }}
            >
                {Icon && <Icon className="text-slate-300 mr-1 shrink-0" size={16} />}
                
                {multiple && selectedValues.map(val => {
                    const opt = allOptions.find(o => o.value === val);
                    const label = opt ? opt.label : val;
                    return (
                        <span key={val} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm animate-in fade-in zoom-in-95">
                            {label}
                            <button 
                                type="button"
                                onClick={(e) => removeTag(val, e)}
                                className="hover:bg-red-50 hover:text-red-500 rounded-full p-0.5 transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    );
                })}

                <input
                    ref={internalInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        if (!searchable) return;
                        const val = e.target.value;
                        setQuery(val);
                        setOpen(true);
                        if (onSearchChange) {
                            onSearchChange(val);
                        }
                    }}
                    onFocus={() => {
                        setOpen(true);
                    }}
                    onBlur={onBlur} // Add onBlur support
                    onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !query && multiple && selectedValues.length > 0) {
                            const last = selectedValues[selectedValues.length - 1];
                            onChange(selectedValues.filter(v => v !== last));
                        }
                        if (e.key === 'Enter' && showAddOption) {
                            e.preventDefault();
                            handleCustomAdd();
                        }
                    }}
                    disabled={disabled}
                    readOnly={!searchable}
                    placeholder={multiple && selectedValues.length > 0 ? "" : placeholder}
                    className={`flex-1 bg-transparent border-none outline-none text-sm font-bold text-slate-700 placeholder:text-slate-400 min-w-[60px] ${!searchable ? 'cursor-pointer caret-transparent' : ''}`}
                />
                
                <div className="text-slate-400 ml-auto pointer-events-none">
                    {loading ? (
                         <Loader2 size={14} className="animate-spin text-primary-500" />
                    ) : (
                        <ChevronsUpDown size={14} />
                    )}
                </div>

                {open && !disabled && (
                    <div 
                        className={`
                            absolute left-0 z-50 w-full bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-2
                            ${placement === 'top' ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top'}
                        `}
                    >
                        {/* Virtualized dropdown list — büyük option listelerinde DOM freeze önler */}
                        <div
                            ref={dropdownListRef}
                            style={{ maxHeight: 240, overflowY: 'auto' }}
                            className="scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent pr-1"
                        >
                            {filteredOptions.length === 0 && !showAddOption && !loading && (
                                <div className="py-3 px-4 text-sm text-slate-400 text-center font-medium">
                                    Sonuç bulunamadı
                                </div>
                            )}

                            {loading && filteredOptions.length === 0 && (
                                <div className="py-3 px-4 text-sm text-slate-400 text-center font-medium">
                                    Aranıyor...
                                </div>
                            )}

                            {/* Virtualizer container — yalnızca görünür satırları DOM'a yazar */}
                            {filteredOptions.length > 0 && (
                                <div
                                    style={{
                                        height: dropdownVirtualizer.getTotalSize(),
                                        width: '100%',
                                        position: 'relative',
                                    }}
                                >
                                    {dropdownVirtualizer.getVirtualItems().map((virtualRow) => {
                                        const option = filteredOptions[virtualRow.index];
                                        if (!option) return null;
                                        const isSelected = multiple
                                            ? selectedValues.includes(option.value)
                                            : option.value === value;

                                        return (
                                            <div
                                                key={option.value}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: virtualRow.size,
                                                    transform: `translateY(${virtualRow.start}px)`,
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelect(option);
                                                    }}
                                                    className={`
                                                        w-full h-full text-left px-4 rounded-xl text-sm transition-colors flex items-center justify-between group
                                                        ${isSelected ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50'}
                                                    `}
                                                >
                                                    {renderOption ? (
                                                        renderOption(option, isSelected)
                                                    ) : (
                                                        <>
                                                            <HighlightedText text={option.label} highlight={searchable ? query : ""} />
                                                            {isSelected && <Check size={16} className="text-primary-600" />}
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {showAddOption && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCustomAdd();
                                    }}
                                    className="w-full text-left px-4 py-3 rounded-xl text-sm transition-colors flex items-center gap-2 hover:bg-slate-50 mt-1 bg-slate-50/50 border border-dashed border-slate-200 text-slate-600"
                                >
                                    <div className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500">
                                        <Plus size={14} strokeWidth={3} />
                                    </div>
                                    <span className="font-medium">
                                        <span className="font-bold text-slate-900">"{query}"</span> olarak ekle
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {error && <p className="text-[10px] font-bold text-red-500 ml-1">{error}</p>}
        </div>
    );
});
