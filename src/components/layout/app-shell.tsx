"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";
import {
  getSidebarCollapsedServerSnapshot,
  getSidebarCollapsedSnapshot,
  setSidebarCollapsed,
  subscribeSidebarCollapsed,
} from "./sidebar-collapse-store";

export function AppShell({
  children,
  userLabel,
  campaignLabel,
}: {
  children: ReactNode;
  userLabel: string;
  campaignLabel?: string;
}) {
  const collapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    getSidebarCollapsedSnapshot,
    getSidebarCollapsedServerSnapshot,
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar userLabel={userLabel} campaignLabel={campaignLabel} />
      <div className="flex flex-1">
        {/* Barra lateral azul-marinho — 240px aberta / 72px recolhida,
            manual de identidade visual, seção 6.1. */}
        <aside
          className={`hidden shrink-0 flex-col bg-brand-navy p-4 transition-[width] duration-200 md:flex dark:border-r dark:border-slate-800 dark:bg-transparent ${
            collapsed ? "w-[72px]" : "w-60"
          }`}
        >
          <div className="flex-1">
            <SidebarNav collapsed={collapsed} />
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className="mt-2 flex items-center justify-center rounded-field border-l-2 border-transparent px-3 py-2 text-white/70 transition-colors hover:bg-white/5 hover:text-white dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5 shrink-0" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-5 w-5 shrink-0" aria-hidden="true" />
            )}
          </button>
        </aside>
        <main className="min-w-0 flex-1 bg-surface-page p-4 sm:p-6 dark:bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}
