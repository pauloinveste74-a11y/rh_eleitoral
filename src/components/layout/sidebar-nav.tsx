"use client";

import { NAV_ITEMS } from "@/lib/nav-items";
import { NavLink } from "./nav-link";

export function SidebarNav({
  onNavigate,
  collapsed = false,
  isPlatformAdmin = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  isPlatformAdmin?: boolean;
}) {
  const items = NAV_ITEMS.filter((item) => !item.requiresPlatformAdmin || isPlatformAdmin);
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1">
      {items.map((item) => (
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
