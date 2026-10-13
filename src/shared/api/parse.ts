/**
 * [MODÜL: SAVUNMACI PARSE YARDIMCILARI]
 * Amaç: API yanıtını domain modeline çevirirken tip belirsizliklerini tek yerde çözmek.
 *
 * Neden gerekli: API `castTypes` ile değerleri dönüştürüyor ama tutarsız:
 *   - `is_featured` bazen 0/1, bazen true/false
 *   - `socials` bir uçta dizi, diğerinde JSON string
 *   - `options` JSON string içinde dizi
 * Mapper'lar bu fonksiyonları kullanır; her mapper aynı kontrolleri tekrar yazmaz (DRY).
 */

export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Boş string'i null kabul eder; sayıları metne çevirir. */
export function str(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

export function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

/** true / 1 / "1" / "true" → true */
export function bool(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

/** JSON string olarak gelmiş olabilecek değeri çözer. */
export function maybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function records(value: unknown): UnknownRecord[] {
  const parsed = maybeJson(value);
  return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
}

export function strings(value: unknown): string[] {
  const parsed = maybeJson(value);
  if (Array.isArray(parsed)) return parsed.map(str).filter((item): item is string => item !== null);
  const single = str(parsed);
  return single ? single.split(',').map((item) => item.trim()).filter(Boolean) : [];
}

/**
 * API tarihleri saat dilimi içermez ve Europe/Istanbul'dur ("2026-11-05 10:00:00").
 * ISO'ya çevrilip +03:00 eklenir ki sunucu hangi bölgede çalışırsa çalışsın doğru yorumlansın.
 */
export function apiDate(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) return text;
  const iso = text.replace(' ', 'T');
  const withSeconds = /T\d{2}:\d{2}$/.test(iso) ? `${iso}:00` : iso;
  const normalized = /T/.test(withSeconds) ? withSeconds : `${withSeconds}T00:00:00`;
  return `${normalized}+03:00`;
}
