/**
 * @file Uygulama kabuğu — rail + header + kaydırılabilir içerik + mobil nav.
 * Author: Ferhat Cengiz
 *
 * Sayfa tarayıcı yüksekliğine sabitlenir; kaydırma body'de değil `<main>`'de olur,
 * böylece rail ve header yerinden oynamaz. Router'ın `<Outlet />`'i `children`
 * olarak verilir.
 *
 * Örnek:
 *   <AppShell
 *     railVariant="labeled"
 *     sidebar={<NavRail items={items} activeKey={activeKey} onNavigate={go} />}
 *     header={<AppHeader leading={<Breadcrumb items={crumbs} />} user={<UserMenu user={me} onLogout={logout} />} />}
 *     mobileNav={<BottomNav items={items} activeKey={activeKey} onNavigate={go} more={{ onClick: openSheet }} />}
 *     overlays={<MobileMenuSheet isOpen={sheetOpen} onClose={closeSheet} items={items} />}
 *   >
 *     <Outlet />
 *   </AppShell>
 */

import type { ReactNode } from 'react';
import { NAV_RAIL_OFFSET, type NavRailVariant } from './NavRail';

export interface AppShellProps {
  readonly sidebar?: ReactNode;
  readonly header?: ReactNode;
  readonly mobileNav?: ReactNode;
  /** Mobil çekmece, global modal/composer gibi içerik dışı katmanlar. */
  readonly overlays?: ReactNode;
  /** İçerik alanının soldan ne kadar itileceğini belirler; `sidebar` ile aynı olmalı. */
  readonly railVariant?: NavRailVariant;
  readonly children?: ReactNode;
  /** `<main>` padding'ini değiştirmek için (varsayılan: ATS admin/callcenter ölçüleri). */
  readonly contentClassName?: string;
  readonly className?: string;
}

export function AppShell({
  sidebar,
  header,
  mobileNav,
  overlays,
  railVariant = 'labeled',
  children,
  contentClassName = 'p-4 pb-24 md:p-6 md:pb-8 lg:p-8',
  className = '',
}: AppShellProps) {
  return (
    <div className={`flex h-screen overflow-hidden bg-[#F8F9FC] font-sans ${className}`}>
      {sidebar}
      <div className={`flex min-w-0 flex-1 flex-col ${sidebar ? NAV_RAIL_OFFSET[railVariant] : ''}`}>
        {header}
        <main className={`flex-1 overflow-y-auto ${contentClassName}`}>{children}</main>
      </div>
      {mobileNav}
      {overlays}
    </div>
  );
}
