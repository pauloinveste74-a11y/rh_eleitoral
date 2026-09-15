import type { Metadata } from "next";
import Link from "next/link";
import { Users, CheckSquare, FileWarning, Send, Wallet, Receipt } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { PERSON_STATUS_LABEL } from "@/lib/reports/pessoas";
import {
  fetchCoordinatorSummary,
  fetchFinanceSummary,
  fetchOrgSummary,
  fetchRecentPeople,
} from "@/lib/painel/dashboard";

export const metadata: Metadata = {
  title: "Painel",
};

const RECENT_LIMIT = 8;

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  ativo: "success",
  validado: "success",
  aprovado_gestor: "success",
  correcao_solicitada: "warning",
  divergente: "warning",
  aguardando_gestor: "warning",
  aguardando_rh: "warning",
  em_conferencia: "warning",
  rejeitado: "destructive",
  arquivado: "destructive",
  suspenso: "destructive",
  desligado: "destructive",
};

interface Kpi {
  label: string;
  value: number | string;
  icon: typeof Users;
  href?: string;
}

function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map(({ label, value, icon: Icon, href }) => {
        const card = (
          <Card className={href ? "transition-colors hover:border-state-info dark:hover:border-slate-700" : undefined}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>{label}</CardTitle>
              <Icon className="h-4 w-4 text-brand-graphite/60" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-brand-navy dark:text-slate-50">
                {value}
              </p>
            </CardContent>
          </Card>
        );
        return (
          <div key={label}>
            {href ? <Link href={href}>{card}</Link> : card}
          </div>
        );
      })}
    </div>
  );
}

export default async function PainelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: profile }, { data: isAdminRh }, { data: isFinance }] = await Promise.all([
    supabase.from("profiles").select("person_id").eq("id", user.id).maybeSingle(),
    supabase.rpc("has_role", { role_codes: ["administrador", "rh"] }),
    supabase.rpc("has_role", {
      role_codes: ["administrador", "financeiro", "tesouraria"],
    }),
  ]);
  const ownPersonId = profile?.person_id ?? null;

  const coordinatorSummary = ownPersonId
    ? await fetchCoordinatorSummary(supabase, user.id, ownPersonId)
    : null;
  // A seção "Minha equipe" só aparece se houver algo pra mostrar — evita um
  // bloco vazio pra quem nunca convidou/coordenou ninguém.
  const showCoordinatorSection =
    coordinatorSummary !== null &&
    (coordinatorSummary.teamCount > 0 ||
      coordinatorSummary.pendingInvitesSent > 0 ||
      coordinatorSummary.pendingDecisions > 0);

  const orgSummary = isAdminRh ? await fetchOrgSummary(supabase) : null;
  const financeSummary = isFinance ? await fetchFinanceSummary(supabase) : null;
  const recentPeople = await fetchRecentPeople(supabase, RECENT_LIMIT);

  const orgKpis: Kpi[] = orgSummary
    ? [
        { label: "Pessoas ativas", value: orgSummary.activePeople, icon: Users, href: "/relatorios/pessoas" },
        {
          label: "Aguardando gestor",
          value: orgSummary.pendingGestor,
          icon: CheckSquare,
          href: "/validacoes",
        },
        { label: "Aguardando RH", value: orgSummary.pendingRh, icon: CheckSquare, href: "/validacoes" },
        {
          label: "Correções pendentes",
          value: orgSummary.pendingCorrections,
          icon: FileWarning,
        },
      ]
    : [];

  const financeKpis: Kpi[] = financeSummary
    ? [
        {
          label: "Despesas a autorizar",
          value: financeSummary.pendingExpenses,
          icon: Receipt,
          href: "/despesas",
        },
        {
          label: "Pagamentos a aprovar",
          value: financeSummary.pendingPayments,
          icon: Wallet,
          href: "/aprovacoes",
        },
      ]
    : [];

  const coordinatorKpis: Kpi[] = coordinatorSummary
    ? [
        { label: "Minha equipe", value: coordinatorSummary.teamCount, icon: Users, href: "/minha-equipe" },
        {
          label: "Cadastros a decidir",
          value: coordinatorSummary.pendingDecisions,
          icon: CheckSquare,
          href: "/validacoes",
        },
        {
          label: "Correções pendentes",
          value: coordinatorSummary.pendingCorrections,
          icon: FileWarning,
        },
        {
          label: "Convites em aberto",
          value: coordinatorSummary.pendingInvitesSent,
          icon: Send,
          href: "/minha-equipe",
        },
      ]
    : [];

  const hasAnyRoleSummary = orgKpis.length > 0 || financeKpis.length > 0 || showCoordinatorSection;

  return (
    <>
      <PageHeader
        title="Painel"
        description="Indicadores reais da campanha, por escopo de acesso — administrador/RH veem a campanha inteira, coordenadores veem a própria equipe."
      />

      {orgKpis.length > 0 && (
        <div className="mb-6">
          <KpiGrid kpis={orgKpis} />
        </div>
      )}

      {financeKpis.length > 0 && (
        <div className="mb-6">
          <KpiGrid kpis={financeKpis} />
        </div>
      )}

      {showCoordinatorSection && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-brand-navy dark:text-slate-50">
              Minha equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <KpiGrid kpis={coordinatorKpis} />
          </CardContent>
        </Card>
      )}

      {!hasAnyRoleSummary && (
        <Card className="mb-6">
          <CardContent className="p-6 text-sm text-brand-graphite dark:text-slate-400">
            Sem indicadores de gestão para o seu perfil de acesso.{" "}
            {ownPersonId ? (
              <Link href="/meu-cadastro" className="underline underline-offset-4">
                Veja o seu cadastro
              </Link>
            ) : (
              <Link href="/meu-cadastro" className="underline underline-offset-4">
                Complete o seu cadastro
              </Link>
            )}
            .
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-brand-navy dark:text-slate-50">
            Cadastros recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentPeople.length === 0 ? (
            <p className="py-8 text-center text-sm text-brand-graphite dark:text-slate-400">
              Nenhum cadastro visível para o seu perfil ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-default text-brand-graphite dark:border-slate-800 dark:text-slate-400">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Pessoa
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Cadastrado em
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Situação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentPeople.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-border-default last:border-0 dark:border-slate-800"
                    >
                      <td className="py-2 pr-4 text-brand-navy dark:text-slate-50">
                        <Link href={`/pessoas/${p.id}/editar`} className="hover:underline">
                          {p.fullName}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-brand-graphite dark:text-slate-300">
                        {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2">
                        <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"}>
                          {PERSON_STATUS_LABEL[p.status] ?? p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
