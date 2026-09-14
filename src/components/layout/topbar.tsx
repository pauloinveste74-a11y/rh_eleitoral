import Link from "next/link";
import { LogOut, UserCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logout } from "@/app/(app)/actions";
import { MobileNav } from "./mobile-nav";

export function Topbar({
  userLabel,
  campaignLabel,
}: {
  userLabel: string;
  campaignLabel?: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950">
      <MobileNav />
      <span className="font-semibold text-slate-900 dark:text-slate-50">
        RH Eleitoral
      </span>
      {campaignLabel && (
        <span className="hidden text-sm text-slate-500 sm:inline dark:text-slate-400">
          · {campaignLabel}
        </span>
      )}
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-sm text-slate-600 sm:inline dark:text-slate-300">
          {userLabel}
        </span>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/conta">
            <UserCircle className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Minha conta</span>
          </Link>
        </Button>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
