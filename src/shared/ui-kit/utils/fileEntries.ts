/**
 * @file Dosya ve klasör okuma. Tıklama (`<input webkitdirectory>`) ve sürükle-bırak
 * (`DataTransferItem.webkitGetAsEntry`) aynı çıktıyı üretir: her dosya göreli yoluyla.
 */

import { isSystemFile } from './uploadRules';

export interface PickedFile {
  readonly file: File;
  /** Klasör içindeki göreli yol (ör. `Proje/2026/rapor.pdf`); tek dosyada yalnızca ad. */
  readonly relativePath: string;
}

/** `<input type="file">` seçimi. Klasör seçiminde tarayıcı `webkitRelativePath` doldurur. */
export function filesFromInput(files: FileList | readonly File[] | null): PickedFile[] {
  if (!files) return [];
  return Array.from(files)
    .filter((file) => !isSystemFile(file.name))
    .map((file) => ({ file, relativePath: file.webkitRelativePath || file.name }));
}

/**
 * Sürükle-bırak. Alt klasörler özyinelemeli okunur.
 * Not: DataTransfer yalnızca olay sırasında geçerlidir; girdiler ilk `await`'ten ÖNCE alınır.
 */
export async function filesFromDataTransfer(dataTransfer: DataTransfer): Promise<PickedFile[]> {
  const items = Array.from(dataTransfer.items ?? []).filter((item) => item.kind === 'file');
  const entries = items.map((item) => item.webkitGetAsEntry?.() ?? null);

  // Giriş API'si yoksa (eski tarayıcı) klasörsüz düz dosya listesine düşülür
  if (entries.length === 0 || entries.some((entry) => entry === null)) return filesFromInput(dataTransfer.files);

  const nested = await Promise.all(entries.map((entry) => readEntry(entry as FileSystemEntry, '')));
  return nested.flat();
}

async function readEntry(entry: FileSystemEntry, parent: string): Promise<PickedFile[]> {
  const relativePath = parent ? `${parent}/${entry.name}` : entry.name;
  if (isFileEntry(entry)) {
    if (isSystemFile(entry.name)) return [];
    const file = await new Promise<File>((resolve, reject) => entry.file(resolve, reject));
    return [{ file, relativePath }];
  }
  if (isDirectoryEntry(entry)) {
    const children = await readAllEntries(entry.createReader());
    const nested = await Promise.all(children.map((child) => readEntry(child, relativePath)));
    return nested.flat();
  }
  return [];
}

/** `readEntries` her çağrıda en fazla ~100 girdi döner; boş dönene kadar tekrar çağrılır. */
async function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const all: FileSystemEntry[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
    if (batch.length === 0) return all;
    all.push(...batch);
  }
}

function isFileEntry(entry: FileSystemEntry): entry is FileSystemFileEntry {
  return entry.isFile;
}

function isDirectoryEntry(entry: FileSystemEntry): entry is FileSystemDirectoryEntry {
  return entry.isDirectory;
}

export interface FileTreeFolder<T> {
  readonly kind: 'folder';
  readonly name: string;
  /** Kökten itibaren yol; ağaçta benzersiz anahtar. */
  readonly path: string;
  readonly children: ReadonlyArray<FileTreeNode<T>>;
  readonly fileCount: number;
  readonly size: number;
}

export interface FileTreeFile<T> {
  readonly kind: 'file';
  readonly name: string;
  readonly path: string;
  readonly item: T;
}

export type FileTreeNode<T> = FileTreeFolder<T> | FileTreeFile<T>;

interface MutableFolder<T> {
  name: string;
  path: string;
  folders: Map<string, MutableFolder<T>>;
  files: Array<FileTreeFile<T>>;
}

/**
 * Göreli yollardan klasör ağacı kurar. Klasörler önce, sonra dosyalar; her grup Türkçe alfabeye göre sıralı.
 * Klasörlerin dosya sayısı ve toplam boyutu hesaplanmış gelir.
 */
export function buildFileTree<T extends { readonly relativePath: string; readonly size: number }>(items: readonly T[]): FileTreeFolder<T> {
  const root: MutableFolder<T> = { name: '', path: '', folders: new Map(), files: [] };
  for (const item of items) {
    const segments = item.relativePath.split('/');
    const fileName = segments.pop() ?? item.relativePath;
    let folder = root;
    for (const segment of segments) {
      let next = folder.folders.get(segment);
      if (!next) {
        next = { name: segment, path: folder.path ? `${folder.path}/${segment}` : segment, folders: new Map(), files: [] };
        folder.folders.set(segment, next);
      }
      folder = next;
    }
    folder.files.push({ kind: 'file', name: fileName, path: item.relativePath, item });
  }
  return freeze(root);
}

const collator = new Intl.Collator('tr', { numeric: true, sensitivity: 'base' });

function freeze<T extends { readonly size: number }>(folder: MutableFolder<T>): FileTreeFolder<T> {
  const folders = [...folder.folders.values()].map((child) => freeze(child)).sort((a, b) => collator.compare(a.name, b.name));
  const files = [...folder.files].sort((a, b) => collator.compare(a.name, b.name));
  return {
    kind: 'folder',
    name: folder.name,
    path: folder.path,
    children: [...folders, ...files],
    fileCount: folders.reduce((sum, f) => sum + f.fileCount, 0) + files.length,
    size: folders.reduce((sum, f) => sum + f.size, 0) + files.reduce((sum, f) => sum + f.item.size, 0),
  };
}
