/**
 * @file Herkese açık paylaşımdaki klasör ağacı. Salt okunur; dosya bazında indirme.
 * Klavye (ARIA tree deseni): ↑/↓ gezin, → aç / içine gir, ← kapat / üst klasöre çık, Home/End, Enter: indir ya da aç/kapat.
 */

import { ChevronRight, Download, Folder, FolderOpen } from 'lucide-react';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { PublicShareFile } from '../api/types';
import { buildFileTree, type FileTreeFolder, type FileTreeNode } from '../utils/fileEntries';
import { formatBytes } from '../utils/formatBytes';
import { FileTypeIcon } from './fileIcon';

export interface SharedFileTreeProps {
  readonly files: readonly PublicShareFile[];
  readonly className?: string;
}

interface VisibleNode {
  readonly node: FileTreeNode<PublicShareFile>;
  readonly level: number;
  readonly parentPath: string | null;
  readonly position: number;
  readonly setSize: number;
}

function flatten(folder: FileTreeFolder<PublicShareFile>, expanded: ReadonlySet<string>, level = 1, parentPath: string | null = null): VisibleNode[] {
  return folder.children.flatMap((node, index) => {
    const self: VisibleNode = { node, level, parentPath, position: index + 1, setSize: folder.children.length };
    return node.kind === 'folder' && expanded.has(node.path) ? [self, ...flatten(node, expanded, level + 1, node.path)] : [self];
  });
}

export function SharedFileTree({ files, className = '' }: SharedFileTreeProps) {
  const tree = useMemo(() => buildFileTree(files), [files]);
  // Tek kök klasör varsa açık başlar: kullanıcı doğrudan içeriği görür
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => {
    const [only] = tree.children;
    return new Set(tree.children.length === 1 && only?.kind === 'folder' ? [only.path] : []);
  });
  const visible = useMemo(() => flatten(tree, expanded), [tree, expanded]);
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());

  const activePath = focusedPath !== null && visible.some((v) => v.node.path === focusedPath) ? focusedPath : (visible[0]?.node.path ?? null);

  const focus = (path: string | undefined) => {
    if (path === undefined) return;
    setFocusedPath(path);
    itemRefs.current.get(path)?.focus();
  };

  const toggle = (path: string, open?: boolean) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open ?? !next.has(path)) next.add(path);
      else next.delete(path);
      return next;
    });

  const onKeyDown = (event: KeyboardEvent, item: VisibleNode, index: number) => {
    const { node } = item;
    const isOpen = node.kind === 'folder' && expanded.has(node.path);
    switch (event.key) {
      case 'ArrowDown':
        focus(visible[index + 1]?.node.path);
        break;
      case 'ArrowUp':
        focus(visible[index - 1]?.node.path);
        break;
      case 'Home':
        focus(visible[0]?.node.path);
        break;
      case 'End':
        focus(visible[visible.length - 1]?.node.path);
        break;
      case 'ArrowRight':
        if (node.kind !== 'folder') return;
        if (isOpen) focus(visible[index + 1]?.node.path);
        else toggle(node.path, true);
        break;
      case 'ArrowLeft':
        if (isOpen) toggle(node.path, false);
        else focus(item.parentPath ?? undefined);
        break;
      case 'Enter':
      case ' ':
        if (node.kind === 'folder') toggle(node.path);
        else linkRefs.current.get(node.path)?.click();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <ul role="tree" aria-label="Paylaşılan dosyalar" className={`space-y-0.5 ${className}`}>
      {visible.map((item, index) => {
        const { node, level } = item;
        const isFolder = node.kind === 'folder';
        const isOpen = isFolder && expanded.has(node.path);

        return (
          <li
            key={node.path}
            ref={(el) => {
              if (el) itemRefs.current.set(node.path, el);
              else itemRefs.current.delete(node.path);
            }}
            role="treeitem"
            aria-level={level}
            aria-posinset={item.position}
            aria-setsize={item.setSize}
            aria-expanded={isFolder ? isOpen : undefined}
            aria-label={isFolder ? `${node.name} klasörü, ${node.fileCount} dosya` : `${node.name}, ${formatBytes(node.item.size)}`}
            tabIndex={node.path === activePath ? 0 : -1}
            onKeyDown={(event) => onKeyDown(event, item, index)}
            onFocus={() => setFocusedPath(node.path)}
            onClick={isFolder ? () => toggle(node.path) : undefined}
            className={`flex min-h-[48px] items-center gap-2 rounded-xl pr-2 text-sm outline-none transition-colors focus-visible:ring-4 focus-visible:ring-primary-500/20 ${
              isFolder ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/60'
            }`}
            style={{ paddingLeft: 8 + (level - 1) * 20 }}
          >
            <ChevronRight
              size={14}
              aria-hidden="true"
              className={`shrink-0 text-slate-400 transition-transform ${isFolder ? '' : 'invisible'} ${isOpen ? 'rotate-90' : ''}`}
            />
            {isFolder ? (
              isOpen ? (
                <FolderOpen size={18} aria-hidden="true" className="shrink-0 text-primary-600" />
              ) : (
                <Folder size={18} aria-hidden="true" className="shrink-0 text-primary-600" />
              )
            ) : (
              <FileTypeIcon mimeType={node.item.mimeType} className="shrink-0 text-slate-400" />
            )}
            <span className="min-w-0 flex-1 truncate font-bold text-slate-700" title={node.path}>
              {node.name}
            </span>
            <span className="shrink-0 text-xs font-medium tabular-nums text-slate-400">
              {isFolder ? `${node.fileCount} dosya · ${formatBytes(node.size)}` : formatBytes(node.item.size)}
            </span>
            {!isFolder && (
              <a
                ref={(el) => {
                  if (el) linkRefs.current.set(node.path, el);
                  else linkRefs.current.delete(node.path);
                }}
                href={node.item.downloadUrl}
                download={node.name}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={-1}
                aria-hidden="true"
                onClick={(event) => event.stopPropagation()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary-700"
                title="İndir"
              >
                <Download size={16} />
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
