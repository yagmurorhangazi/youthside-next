/**
 * @file Dosya türüne göre ikon (liste ve ağaçta ortak) ve yol yardımcısı.
 */

import { File, FileSpreadsheet, FileText, Film, Image } from 'lucide-react';

export interface FileTypeIconProps {
  readonly mimeType: string;
  readonly size?: number;
  readonly className?: string;
}

export function FileTypeIcon({ mimeType, size = 18, className }: FileTypeIconProps) {
  const props = { size, className, 'aria-hidden': true } as const;
  if (mimeType.startsWith('image/')) return <Image {...props} />;
  if (mimeType.startsWith('video/')) return <Film {...props} />;
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileSpreadsheet {...props} />;
  if (mimeType === 'application/pdf' || mimeType.includes('word')) return <FileText {...props} />;
  return <File {...props} />;
}

/** `klasör/alt/dosya.pdf` → { name: 'dosya.pdf', folder: 'klasör/alt' } */
export function splitPath(relativePath: string): { readonly name: string; readonly folder: string } {
  const index = relativePath.lastIndexOf('/');
  return index === -1 ? { name: relativePath, folder: '' } : { name: relativePath.slice(index + 1), folder: relativePath.slice(0, index) };
}
