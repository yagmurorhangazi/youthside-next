/**
 * @file Checkbox kontrolünü izole temel UI parçası olarak dışa açar.
 * @author Ferhat Cengiz
 */

/**
 * Bu component native checkbox davranışını korur; sadece projedeki görsel standardı tek yerde toplar.
 * Storybook içinde ayrı görülmesi, form ekranlarında checkbox tasarımının kopyalanmasını engeller.
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  description?: ReactNode;
  error?: string;
  containerClassName?: string;
}

/**
 * Checkbox, boolean seçimlerin tek sorumluluklu kontrolüdür.
 * Controlled veya uncontrolled kullanılabilir; state sahipliği parent componentte kalır.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
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
      type="checkbox"
      disabled={disabled}
      className={`mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:cursor-not-allowed ${error ? 'border-red-400' : ''} ${className}`}
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

Checkbox.displayName = 'Checkbox';
