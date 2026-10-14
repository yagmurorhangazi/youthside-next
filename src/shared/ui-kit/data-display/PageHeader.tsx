/**
 * @file Sayfa başlığı + açıklama + aksiyon butonları bloğu.
 * Author: Ferhat Cengiz
 *
 * Her liste/detay sayfasının üstünde tutarlı başlık alanı sağlar.
 */

import type { ReactNode } from 'react';

export interface PageHeaderProps {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly actions?: ReactNode;
  readonly className?: string;
}

export function PageHeader({ title, description, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-4 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-xl font-black tracking-tight text-slate-800 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-sm text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0 sm:gap-3">{actions}</div>}
    </div>
  );
}
