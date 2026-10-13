/**
 * @file Radio kontrolünü izole temel UI parçası olarak dışa açar.
 * @author Ferhat Cengiz
 */

/**
 * Radio tek seçimli seçenek grupları için kullanılır.
 * Componentin küçük kalması, option yönetimini parent form veya feature componentte bırakır.
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  description?: ReactNode;
  error?: string;
  containerClassName?: string;
}

/**
 * Radio native input kullandığı için klavye ve form davranışı tarayıcı standardında kalır.
 * Storybook'ta her state'i ayrı görüldüğünde form kararları daha rahat kontrol edilir.
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(({
  label,
  description,
  error,
  className = '',
  containerClassName = '',
  disabled,
  ...props
}, ref) => (
  <label className={`flex items-start gap-3 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${containerClassName}`}>
    <input
      ref={ref}
      type="radio"
      disabled={disabled}
      className={`mt-0.5 h-4 w-4 border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:cursor-not-allowed ${error ? 'border-red-400' : ''} ${className}`}
      {...props}
    />
    {(label || description || error) && (
      <span className="min-w-0">
        {label && <span className="block text-sm font-bold text-slate-700">{label}</span>}
        {description && <span className="mt-0.5 block text-xs font-medium text-slate-500">{description}</span>}
        {error && <span className="mt-1 block text-xs font-semibold text-red-500">{error}</span>}
      </span>
    )}
  </label>
));

Radio.displayName = 'Radio';
