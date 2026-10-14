/**
 * @file Durum rozeti — Aktif/Pasif/Onay Bekliyor gibi durumları noktalı etiketle gösterir.
 * Author: Ferhat Cengiz
 *
 * Tablo satırlarında tekrar eden durum gösterimini standartlaştırır.
 */

export type StatusVariant =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'draft'
  | 'published'
  | 'cancelled'
  | 'completed'
  | 'paused'
  | 'running'
  | 'failed';

export interface StatusBadgeProps {
  readonly status: StatusVariant;
  /** Varsayılan Türkçe etiketin yerine geçer. */
  readonly label?: string;
  readonly className?: string;
}

const STATUS_CONFIG: Record<StatusVariant, { label: string; badge: string; dot: string }> = {
  active: { label: 'Aktif', badge: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' },
  inactive: { label: 'Pasif', badge: 'bg-slate-50 text-slate-500 border-slate-100', dot: 'bg-slate-400' },
  pending: { label: 'Onay Bekliyor', badge: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-500' },
  approved: { label: 'Onaylandı', badge: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' },
  rejected: { label: 'Reddedildi', badge: 'bg-red-50 text-red-600 border-red-100', dot: 'bg-red-500' },
  draft: { label: 'Taslak', badge: 'bg-slate-50 text-slate-500 border-slate-100', dot: 'bg-slate-400' },
  published: { label: 'Yayında', badge: 'bg-blue-50 text-blue-600 border-blue-100', dot: 'bg-emerald-500' },
  cancelled: { label: 'İptal Edildi', badge: 'bg-red-50 text-red-500 border-red-100', dot: 'bg-red-500' },
  completed: { label: 'Tamamlandı', badge: 'bg-violet-50 text-violet-600 border-violet-100', dot: 'bg-violet-500' },
  paused: { label: 'Duraklatıldı', badge: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-slate-400' },
  running: { label: 'Çalışıyor', badge: 'bg-blue-50 text-blue-600 border-blue-100', dot: 'bg-blue-500 animate-pulse' },
  failed: { label: 'Başarısız', badge: 'bg-red-50 text-red-600 border-red-100', dot: 'bg-red-500' },
};

export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${config.badge} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {label ?? config.label}
    </span>
  );
}
