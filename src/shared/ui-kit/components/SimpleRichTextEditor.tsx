/**
 * @file SimpleRichTextEditor.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Quote, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

/**
 * RichTextEditorRef, ortak UI bileşeni içinde kullanılan veri sözleşmesini tek yerde toplar.
 * Bu tipin ayrı tutulması, admin sayfasında aynı veriyi kullanan componentlerin birbirine gevşek bağlı kalmasını sağlar.
 */
export interface RichTextEditorRef {
    execCommand: (command: string, arg?: string) => void;
}

/**
 * RichTextEditorProps, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
export interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: string;
    label?: string;
    hideToolbar?: boolean; // New prop to hide default toolbar
    className?: string; // Allow custom styling
}

/**
 * SimpleRichTextEditor, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const SimpleRichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({ value, onChange, placeholder, error, label, hideToolbar, className }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);

    const execCommand = (command: string, arg?: string) => {
        document.execCommand(command, false, arg);
        editorRef.current?.focus();
    };

    useImperativeHandle(ref, () => ({
        execCommand
    }));

    /**
     * handleInput, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
     * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
     */
    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            if (editorRef.current.innerHTML === '<br>' && !value) return; 
            if (!editorRef.current.textContent?.trim() && !value) return; 
            
            if (document.activeElement !== editorRef.current) {
                editorRef.current.innerHTML = value || '';
            }
        }
    }, [value]);

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {label && <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>}
            
            {!hideToolbar && (
                <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50/50">
                    {/* Default Toolbar (Legacy) */}
                    <button type="button" onClick={() => execCommand('bold')} className="p-1 hover:bg-slate-200 rounded"><Bold size={16} /></button>
                    <button type="button" onClick={() => execCommand('italic')} className="p-1 hover:bg-slate-200 rounded"><Italic size={16} /></button>
                </div>
            )}

            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="flex-1 outline-none prose prose-sm max-w-none text-slate-700 font-normal overflow-y-auto"
                data-placeholder={placeholder}
            />
            
            {error && <p className="text-[10px] font-bold text-red-500 ml-1">{error}</p>}
        </div>
    );
});

SimpleRichTextEditor.displayName = 'SimpleRichTextEditor';
