/**
 * @file Kaldığı yerden devam: kullanıcının yeniden seçtiği dosyaları sunucudaki taslakla eşler.
 * Tarayıcı, kapanan sayfada seçilmiş dosyalara erişimi geri vermez; bu yüzden aynı dosya/klasör
 * yeniden bırakılır ve yalnızca eksikler yüklenir. Eşleme: göreli yol + boyut (+ varsa değiştirilme zamanı).
 */

import type { RemoteFileState } from '../api/types';

export interface ResumeCandidate {
  readonly relativePath: string;
  readonly size: number;
  readonly lastModified: number;
}

export interface ResumeMatch<T extends ResumeCandidate> {
  /** Sunucuda bekleyen ve seçimde bulunan: yüklenecek. */
  readonly toUpload: readonly T[];
  /** Sunucuda zaten yüklenmiş: atlanır. */
  readonly alreadyUploaded: readonly RemoteFileState[];
  /** Sunucuda bekleyen ama seçimde bulunmayan: kullanıcıdan istenir. */
  readonly missing: readonly RemoteFileState[];
  /** Seçimde olup taslakta olmayan: bu transfere eklenemez. */
  readonly extra: readonly T[];
}

export function matchFilesToManifest<T extends ResumeCandidate>(selected: readonly T[], remote: readonly RemoteFileState[]): ResumeMatch<T> {
  const byPath = new Map(selected.map((file) => [file.relativePath, file]));
  const toUpload: T[] = [];
  const alreadyUploaded: RemoteFileState[] = [];
  const missing: RemoteFileState[] = [];
  const matched = new Set<string>();

  for (const entry of remote) {
    if (entry.status === 'done') {
      alreadyUploaded.push(entry);
      matched.add(entry.relativePath);
      continue;
    }
    const candidate = byPath.get(entry.relativePath);
    const sameFile =
      candidate !== undefined &&
      candidate.size === entry.size &&
      (entry.lastModified === null || candidate.lastModified === entry.lastModified);
    if (sameFile) {
      toUpload.push(candidate);
      matched.add(entry.relativePath);
    } else {
      missing.push(entry);
    }
  }

  const extra = selected.filter((file) => !matched.has(file.relativePath) && !missing.some((m) => m.relativePath === file.relativePath));
  return { toUpload, alreadyUploaded, missing, extra };
}
