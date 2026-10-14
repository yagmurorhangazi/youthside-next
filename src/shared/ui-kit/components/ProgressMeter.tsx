/**
 * @file Belirli bir değeri gösteren ilerleme çubuğu (role="progressbar").
 * Hem genel yükleme ilerlemesinde hem dosya listesindeki satırlarda aynı bileşen kullanılır.
 * Not: `ProgressBar` sayfa üstündeki sahte yükleme çizgisidir; gerçek bir değeri göstermez.
 */

export interface ProgressMeterProps {
  /** 0–100. Aralık dışı değerler sınırlara çekilir. */
  readonly value: number;
  /** Ekran okuyucu için ad (ör. "Yükleme ilerlemesi"). */
  readonly label: string;
  /** Ekran okuyucunun okuyacağı metin (ör. "%42, 12,4 MB / 30 MB"). */
  readonly valueText?: string;
  readonly size?: 'sm' | 'md';
  readonly tone?: 'primary' | 'success' | 'danger';
  /** Değer bilinmiyor (ör. "Link oluşturuluyor"): akan çubuk gösterilir, aria-valuenow verilmez. */
  readonly indeterminate?: boolean;
  readonly className?: string;
}

const heightClasses: Record<NonNullable<ProgressMeterProps['size']>, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
};

const toneClasses: Record<NonNullable<ProgressMeterProps['tone']>, string> = {
  primary: 'bg-primary-600',
  success: 'bg-emerald-500',
  danger: 'bg-red-500',
};

export function ProgressMeter({
  value,
  label,
  valueText,
  size = 'md',
  tone = 'primary',
  indeterminate = false,
  className = '',
}: ProgressMeterProps) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
      aria-valuetext={indeterminate ? valueText : (valueText ?? `%${Math.round(clamped)}`)}
      aria-busy={indeterminate || undefined}
      className={`w-full overflow-hidden rounded-full bg-slate-100 ${heightClasses[size]} ${className}`}
    >
      {indeterminate ? (
        <div className="h-full w-full rounded-full bg-gradient-to-r from-primary-200 via-primary-600 to-primary-200 bg-[length:200%_100%] animate-shimmer motion-reduce:animate-none" />
      ) : (
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none ${toneClasses[tone]}`}
          style={{ width: `${clamped}%` }}
        />
      )}
    </div>
  );
}
