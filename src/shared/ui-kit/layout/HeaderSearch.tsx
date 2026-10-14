/**
 * @file Header içi hızlı arama kutusu.
 * Author: Ferhat Cengiz
 *
 * Kontrollü (`value` + `onChange`) ya da kontrolsüz kullanılabilir. Enter'da
 * `onSubmit` çağrılır. Varsayılan olarak yalnız lg ve üstünde görünür; mobilde
 * header'ı kalabalıklaştırmaz.
 */

import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';

export interface HeaderSearchProps {
  readonly value?: string;
  readonly onChange?: (value: string) => void;
  readonly onSubmit?: (value: string) => void;
  readonly placeholder?: string;
  /** Sağda gösterilecek kısayol ipucu (ör. "⌘K"). */
  readonly shortcutHint?: string;
  /** Mobilde de göstermek için true. */
  readonly alwaysVisible?: boolean;
  readonly className?: string;
}

export function HeaderSearch({
  value,
  onChange,
  onSubmit,
  placeholder = 'Hızlı ara...',
  shortcutHint,
  alwaysVisible = false,
  className = '',
}: HeaderSearchProps) {
  const [internal, setInternal] = useState('');
  const current = value ?? internal;

  const handleChange = (next: string) => {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit?.(current.trim());
  };

  return (
    <form role="search" onSubmit={handleSubmit} className={`relative ${alwaysVisible ? 'block' : 'hidden lg:block'} ${className}`}>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
      <input
        type="search"
        value={current}
        placeholder={placeholder}
        onChange={(event) => handleChange(event.target.value)}
        className={`w-full rounded-xl border border-slate-200/60 bg-slate-50/80 py-2 pl-10 text-sm font-medium transition-all placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/10 lg:w-64 ${
          shortcutHint ? 'pr-12' : 'pr-4'
        }`}
      />
      {shortcutHint && (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
          {shortcutHint}
        </kbd>
      )}
    </form>
  );
}
