"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav-items";

export function NavLink({
  item,
  onNavigate,
  collapsed = false,
}: {
  item: NavItem;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      // Recolhida: só o ícone, centralizado, com o rótulo como tooltip
      // nativo (title) — mesmo padrão do símbolo do manual (seção 2.1).
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-field border-l-2 px-3 py-2 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        isActive
          ? "border-brand-gold bg-white/10 text-white dark:border-slate-50 dark:bg-slate-800 dark:text-slate-50"
          : "border-transparent text-white/70 hover:bg-white/5 hover:text-white dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className={collapsed ? "sr-only" : undefined}>{item.label}</span>
    </Link>
  );
}
