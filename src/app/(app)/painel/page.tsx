import type { Metadata } from "next";
import { Users, CheckSquare, Clock, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Painel",
};

// Dados fictícios apenas para desenvolvimento — nenhuma informação real de
// campanha, pessoa ou pagamento. Serão substituídos por consultas reais ao
// Supabase quando os módulos correspondentes forem implementados.
const kpis = [
  { label: "Pessoas ativas", value: "128", icon: Users },
  { label: "Aprovações pendentes", value: "7", icon: CheckSquare },
  { label: "Pontos em aberto hoje", value: "342", icon: Clock },
  { label: "Pagamentos a aprovar", value: "R$ 18.400,00", icon: Wallet },
];

const recentActivity = [
  {
    person: "Fulano de Tal Silva",
    action: "Registrou entrada de ponto",
    city: "Plano Piloto",
    status: "ok" as const,
  },
  {
    person: "Ciclana Souza Pereira",
    action: "Enviou documentos para validação",
    city: "Ceilândia",
    status: "pendente" as const,
  },
  {
    person: "Beltrano Costa Lima",
    action: "Aguardando validação da cidade",
    city: "Gama",
    status: "pendente" as const,
  },
  {
    person: "Sicrana Oliveira Rocha",
    action: "Cadastro rejeitado — documento ilegível",
    city: "Ceilândia",
    status: "atencao" as const,
  },
];

const statusBadge: Record<
  (typeof recentActivity)[number]["status"],
  { label: string; variant: "success" | "warning" | "destructive" }
> = {
  ok: { label: "Concluído", variant: "success" },
  pendente: { label: "Pendente", variant: "warning" },
  atencao: { label: "Atenção", variant: "destructive" },
};

export default function PainelPage() {
  return (
    <>
      <PageHeader
        title="Painel"
        description="Visão geral da campanha — dados fictícios de desenvolvimento (Fase 1A)."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>{label}</CardTitle>
              <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Atividade recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Pessoa
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Ação
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Cidade/RA
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Situação
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((item) => (
                  <tr
                    key={item.person}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="py-2 pr-4 text-slate-900 dark:text-slate-50">
                      {item.person}
                    </td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">
                      {item.action}
                    </td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">
                      {item.city}
                    </td>
                    <td className="py-2">
                      <Badge variant={statusBadge[item.status].variant}>
                        {statusBadge[item.status].label}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
