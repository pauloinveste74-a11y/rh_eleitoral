import type { createClient } from "@/lib/supabase/server";

type PaymentExpenseStatus = "pendente" | "pago" | "rejeitado" | "cancelado";
const PAYMENT_STATUSES: readonly PaymentExpenseStatus[] = [
  "pendente",
  "pago",
  "rejeitado",
  "cancelado",
];
function asPaymentStatus(v: string | undefined): PaymentExpenseStatus | undefined {
  return PAYMENT_STATUSES.includes(v as PaymentExpenseStatus)
    ? (v as PaymentExpenseStatus)
    : undefined;
}

type ExpenseCategory =
  | "combustivel"
  | "material"
  | "alimentacao"
  | "transporte"
  | "hospedagem"
  | "outro";
const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  "combustivel",
  "material",
  "alimentacao",
  "transporte",
  "hospedagem",
  "outro",
];
function asExpenseCategory(v: string | undefined): ExpenseCategory | undefined {
  return EXPENSE_CATEGORIES.includes(v as ExpenseCategory)
    ? (v as ExpenseCategory)
    : undefined;
}

export interface FinanceiroRow {
  id: string;
  kind: "Pagamento" | "Despesa";
  date: string;
  personId: string;
  description: string;
  status: string;
  amountCents: number;
}

export interface FinanceiroFilters {
  from?: string;
  to?: string;
  type?: string; // todos | pagamento | despesa
  status?: string; // todos | pendente | pago | rejeitado | cancelado
  category?: string; // todas | combustivel | material | ...
}

export const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  combustivel: "Combustível",
  material: "Material",
  alimentacao: "Alimentação",
  transporte: "Transporte",
  hospedagem: "Hospedagem",
  outro: "Outro",
};

/**
 * Busca pagamentos e despesas combinados, aplicando os mesmos filtros nos
 * dois. `personIds`: `null` = não restringir por território, array = restringir
 * a essas pessoas (array vazio = nenhum resultado). Usado tanto pela tela
 * quanto pela exportação CSV, para os dois nunca divergirem.
 */
export async function fetchFinanceiroRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: FinanceiroFilters,
  personIds: string[] | null,
  limit: number,
): Promise<FinanceiroRow[]> {
  const type = filters.type || "todos";
  const status = filters.status || "todos";
  const category = filters.category || "todas";
  const statusValue = status !== "todos" ? asPaymentStatus(status) : undefined;
  const categoryValue = category !== "todas" ? asExpenseCategory(category) : undefined;

  if (personIds !== null && personIds.length === 0) return [];

  const rows: FinanceiroRow[] = [];

  if (type !== "despesa") {
    let q = supabase
      .from("payments")
      .select("id, person_id, description, status, amount_cents, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (filters.from) q = q.gte("created_at", filters.from);
    if (filters.to) q = q.lte("created_at", `${filters.to}T23:59:59`);
    if (statusValue) q = q.eq("status", statusValue);
    if (personIds !== null) q = q.in("person_id", personIds);
    const { data } = await q;
    rows.push(
      ...(data ?? []).map((p) => ({
        id: p.id,
        kind: "Pagamento" as const,
        date: p.created_at,
        personId: p.person_id,
        description: p.description,
        status: p.status,
        amountCents: p.amount_cents,
      })),
    );
  }

  if (type !== "pagamento") {
    let q = supabase
      .from("expenses")
      .select("id, person_id, description, category, status, amount_cents, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (filters.from) q = q.gte("created_at", filters.from);
    if (filters.to) q = q.lte("created_at", `${filters.to}T23:59:59`);
    if (statusValue) q = q.eq("status", statusValue);
    if (categoryValue) q = q.eq("category", categoryValue);
    if (personIds !== null) q = q.in("person_id", personIds);
    const { data } = await q;
    rows.push(
      ...(data ?? []).map((e) => ({
        id: e.id,
        kind: "Despesa" as const,
        date: e.created_at,
        personId: e.person_id,
        description: `${EXPENSE_CATEGORY_LABEL[e.category] ?? e.category} — ${e.description}`,
        status: e.status,
        amountCents: e.amount_cents,
      })),
    );
  }

  rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  return rows.slice(0, limit);
}
