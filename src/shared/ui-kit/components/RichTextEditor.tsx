/**
 * @file RichTextEditor.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import React from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

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
}

/**
 * RichTextEditorHandle, ortak UI bileşeni içinde kullanılan veri sözleşmesini tek yerde toplar.
 * Bu tipin ayrı tutulması, admin sayfasında aynı veriyi kullanan componentlerin birbirine gevşek bağlı kalmasını sağlar.
 */
export interface RichTextEditorHandle {
    focus: () => void;
}

/**
 * modules, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
const modules = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
        ['link'], // Removed 'image' and 'video' as requested
        ['clean']
    ],
};

/**
 * formats, ham veriyi component veya API tarafından beklenen daha temiz şekle dönüştürür.
 * Dönüştürme mantığını burada tutmak, render kodunun sadece ekrana veri basmasını sağlar.
 */
const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link'
];

// ... imports

export const RichTextEditor = React.forwardRef<RichTextEditorHandle, RichTextEditorProps>(({ value, onChange, placeholder, error, label }, ref) => {
    const quillRef = React.useRef<ReactQuill>(null);

    React.useImperativeHandle(ref, () => ({
        focus: () => {
             quillRef.current?.focus();
             // Also try to focus the editor container for scrolling
             const editor = quillRef.current?.getEditor();
             if (editor) {
                 editor.focus();
                 // Scroll into view if needed
                 (quillRef.current as unknown as { editingArea?: HTMLElement })?.editingArea?.scrollIntoView({ behavior: 'smooth', block: 'center' });
             }
        }
    }));

    return (
        <div className="space-y-1.5 rich-text-editor-wrapper">
            {label && <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>}
            
            <div className={`overflow-hidden rounded-2xl border bg-white transition-all ${error ? 'border-red-300' : 'border-slate-200 focus-within:ring-4 focus-within:ring-primary-500/5 focus-within:border-primary-400'}`}>
                <ReactQuill 
                    ref={quillRef}
                    theme="snow"
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    modules={modules}
                    formats={formats}
                    className="h-[300px] flex flex-col"
                />
            </div>
            {error && <p className="text-[10px] font-bold text-red-500 ml-1">{error}</p>}


            {/* Global Style Override for Quill to look polished */}
            <style>{`
                .ql-container.ql-snow {
                    border: none !important;
                    flex: 1;
                    font-family: inherit;
                    font-size: 0.95rem;
                }
                .ql-toolbar.ql-snow {
                    border: none !important;
                    border-bottom: 1px solid #e2e8f0 !important;
                    background: #f8fafc80;
                    padding: 12px !important;
                }
                .ql-editor {
                    min-height: 250px;
                    padding: 16px !important;
                }
                .ql-editor.ql-blank::before {
                    color: #94a3b8;
                    font-style: normal;
                    font-weight: 500;
                }
            `}</style>
        </div>
    );
});
