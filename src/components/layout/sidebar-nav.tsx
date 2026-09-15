"use client";

import { NAV_ITEMS } from "@/lib/nav-items";
import { NavLink } from "./nav-link";

export function SidebarNav({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      ))}
    </nav>
  );
}
