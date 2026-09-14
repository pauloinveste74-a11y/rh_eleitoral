import type { Metadata } from "next";
import Link from "next/link";
import { Wallet, Users, CheckSquare } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Relatórios" };

const REPORTS = [
  {
    href: "/relatorios/financeiro",
    icon: Wallet,
    title: "Financeiro",
    description:
      "Pagamentos e despesas por período, status, categoria e território — com exportação CSV.",
  },
  {
    href: "/relatorios/pessoas",
    icon: Users,
    title: "Pessoas",
    description:
      "Funil por status do cadastro, filtrado por período e território — com exportação CSV.",
  },
  {
    href: "/relatorios/aprovacoes",
    icon: CheckSquare,
    title: "Aprovações",
    description:
      "Histórico de decisões (aprovação/rejeição) por período, autor e território — com exportação CSV.",
  },
];

export default function RelatoriosPage() {
  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Relatórios gerenciais com filtros amplos e exportação em CSV."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="h-full transition-colors hover:border-slate-400 dark:hover:border-slate-600">
              <CardHeader>
                <r.icon className="mb-2 h-6 w-6 text-slate-500 dark:text-slate-400" />
                <CardTitle>{r.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {r.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
