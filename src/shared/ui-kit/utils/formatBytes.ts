/**
 * @file Boyut ve yüzde biçimleme: tek yer. Türkçe biçim: "12,4 MB", "%42".
 */

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

const formatters = new Map<number, Intl.NumberFormat>();
function numberFormat(maximumFractionDigits: number): Intl.NumberFormat {
  let formatter = formatters.get(maximumFractionDigits);
  if (!formatter) {
    formatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits });
    formatters.set(maximumFractionDigits, formatter);
  }
  return formatter;
}

/** 1024 tabanlı insan okunur boyut: 0 B, 512 B, 12,4 MB, 1,2 GB. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  // 100 ve üstünde ondalık gürültüdür (ör. "245 MB"), altında bir basamak yeterlidir
  return `${numberFormat(unit === 0 || value >= 100 ? 0 : 1).format(value)} ${UNITS[unit]}`;
}

/** Türkçe yüzde yazımı: "%42". */
export function formatPercent(percent: number): string {
  return `%${Math.round(percent)}`;
}

/** "12,4 MB / 30 MB" */
export function formatByteProgress(loaded: number, total: number): string {
  return `${formatBytes(loaded)} / ${formatBytes(total)}`;
}
