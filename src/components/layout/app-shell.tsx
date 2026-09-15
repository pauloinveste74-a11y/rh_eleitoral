import type { ReactNode } from "react";

import { SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";

export function AppShell({
  children,
  userLabel,
  campaignLabel,
}: {
  children: ReactNode;
  userLabel: string;
  campaignLabel?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Topbar userLabel={userLabel} campaignLabel={campaignLabel} />
      <div className="flex flex-1">
        {/* Barra lateral azul-marinho, 240 px — manual de identidade visual, seção 6.1. */}
        <aside className="hidden w-60 shrink-0 bg-brand-navy p-4 md:block dark:border-r dark:border-slate-800 dark:bg-transparent">
          <SidebarNav />
        </aside>
        <main className="min-w-0 flex-1 bg-surface-page p-4 sm:p-6 dark:bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}
