import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlcadaRuleForm } from "@/components/despesas/alcada-rule-form";
import { DeleteAlcadaRuleButton } from "@/components/despesas/delete-alcada-rule-button";
import { formatCentsAsBRL } from "@/lib/validations/payment";

export const metadata: Metadata = { title: "Alçadas de despesas" };

export default async function AlcadasPage() {
  const supabase = await createClient();

  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    return (
      <>
        <PageHeader
          title="Alçadas de despesas"
          description="Teto de valor que cada papel pode autorizar."
        />
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Você não tem permissão para acessar esta área — restrita a
              administrador.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  const [{ data: rules }, { data: roles }, { data: profiles }, { data: axes }, { data: cities }] =
    await Promise.all([
      supabase
        .from("expense_authorization_rules")
        .select("id, role_id, profile_id, axis_id, city_id, max_amount_cents")
        .order("max_amount_cents", { ascending: false }),
      supabase.from("roles").select("id, name").order("name"),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("status", "ativo")
        .order("full_name"),
      supabase.from("axes").select("id, name").order("name"),
      supabase.from("cities").select("id, name").order("name"),
    ]);

  const roleNameById = new Map((roles ?? []).map((r) => [r.id, r.name]));
  const profileNameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name || p.email]),
  );
  const axisNameById = new Map((axes ?? []).map((a) => [a.id, a.name]));
  const cityNameById = new Map((cities ?? []).map((c) => [c.id, c.name]));

  return (
    <>
      <PageHeader
        title="Alçadas de despesas"
        description="Teto de valor que cada papel pode autorizar num gasto — hoje é só informativo (não bloqueia criação nem decisão), mostrado como indicador em /despesas."
      />
      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="p-6">
            <AlcadaRuleForm
              roles={(roles ?? []).map((r) => ({ id: r.id, name: r.name }))}
              profiles={(profiles ?? []).map((p) => ({
                id: p.id,
                name: p.full_name || p.email,
              }))}
              axes={(axes ?? []).map((a) => ({ id: a.id, name: a.name }))}
              cities={(cities ?? []).map((c) => ({ id: c.id, name: c.name }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            {(rules ?? []).length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhuma regra de alçada configurada ainda.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Papel</TableHead>
                    <TableHead>Escopo</TableHead>
                    <TableHead>Teto</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rules ?? []).map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-50">
                        {rule.role_id
                          ? (roleNameById.get(rule.role_id) ?? "—")
                          : rule.profile_id
                            ? (profileNameById.get(rule.profile_id) ?? "Pessoa específica")
                            : "—"}
                      </TableCell>
                      <TableCell>
                        {rule.axis_id
                          ? `Eixo: ${axisNameById.get(rule.axis_id) ?? "—"}`
                          : rule.city_id
                            ? `Cidade: ${cityNameById.get(rule.city_id) ?? "—"}`
                            : "Toda a campanha"}
                      </TableCell>
                      <TableCell>{formatCentsAsBRL(rule.max_amount_cents)}</TableCell>
                      <TableCell className="text-right">
                        <DeleteAlcadaRuleButton ruleId={rule.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
