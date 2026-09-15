import Link from "next/link";
import { LogOut, UserCircle, IdCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logout } from "@/app/(app)/actions";
import { MobileNav } from "./mobile-nav";
import { BrandMark } from "./brand-mark";

export function Topbar({
  userLabel,
  campaignLabel,
}: {
  userLabel: string;
  campaignLabel?: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border-default bg-white px-4 dark:border-slate-800 dark:bg-slate-950">
      <MobileNav />
      {/* Marca horizontal — manual de identidade visual, seção 2.1 ("Horizontal: cabeçalho... brasão à esquerda e bloco textual à direita"). */}
      <BrandMark size={28} className="hidden sm:block" />
      <span className="font-heading font-bold text-brand-navy dark:text-slate-50">
        RH Eleitoral
      </span>
      {campaignLabel && (
        <span className="hidden text-sm text-brand-graphite sm:inline dark:text-slate-400">
          · {campaignLabel}
        </span>
      )}
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-sm text-brand-graphite sm:inline dark:text-slate-300">
          {userLabel}
        </span>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/meu-cadastro">
            <IdCard className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Meu cadastro</span>
          </Link>
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/conta">
            <UserCircle className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Minha conta</span>
          </Link>
        </Button>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
