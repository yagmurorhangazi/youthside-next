/**
 * @file Switch kontrolünü izole temel UI parçası olarak dışa açar.
 * @author Ferhat Cengiz
 */

/**
 * Switch, checkbox ile aynı semantiği taşır fakat ayar aç/kapat davranışı için daha uygun görünür.
 * Bu ayrım, form checkbox'ları ile ayar toggle'larının Storybook'ta karışmasını engeller.
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  description?: ReactNode;
  error?: string;
  containerClassName?: string;
}

/**
 * Switch erişilebilirlik için native checkbox kullanır.
 * Görsel thumb ve track CSS ile çizilir; business state parent component tarafından yönetilir.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(({
  label,
  description,
  error,
  containerClassName = '',
  className = '',
  disabled,
  ...props
}, ref) => (
  <label className={`flex items-start justify-between gap-4 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${containerClassName}`}>
    {(label || description || error) && (
      <span className="min-w-0">
        {label && <span className="block text-sm font-bold text-slate-700">{label}</span>}
        {description && <span className="mt-0.5 block text-xs font-medium text-slate-500">{description}</span>}
        {error && <span className="mt-1 block text-xs font-semibold text-red-500">{error}</span>}
      </span>
    )}
    <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
      <input
        ref={ref}
        type="checkbox"
        disabled={disabled}
        className={`peer sr-only ${className}`}
        {...props}
      />
      <span className={`absolute inset-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-primary-600 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 ${error ? 'ring-2 ring-red-300' : ''}`} />
      <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
    </span>
  </label>
));

Switch.displayName = 'Switch';
