import type { ReactNode } from "react";

import { SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";

export function AppShell({
  children,
  userLabel,
}: {
  children: ReactNode;
  userLabel: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Topbar userLabel={userLabel} />
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 p-4 md:block dark:border-slate-800">
          <SidebarNav />
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
