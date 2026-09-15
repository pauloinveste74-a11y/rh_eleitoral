import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCentsAsBRL } from "@/lib/validations/payment";
import { expenseCategoryLabels } from "@/lib/validations/expense";
import type { AlcadaStatus } from "@/lib/expenses/alcada";
import { Badge } from "@/components/ui/badge";
import { ExpenseStatusBadge } from "./expense-status-badge";
import { ExpenseDecisionForm } from "./expense-decision-form";

const ALCADA_LABEL: Record<AlcadaStatus, string> = {
  dentro: "Dentro da alçada",
  fora: "Fora da alçada",
  sem_regra: "Sem regra definida",
};

const ALCADA_VARIANT: Record<AlcadaStatus, "success" | "destructive" | "secondary"> = {
  dentro: "success",
  fora: "destructive",
  sem_regra: "secondary",
};

export type ExpenseRow = {
  id: string;
  personName: string;
  category: keyof typeof expenseCategoryLabels;
  amountCents: number;
  expenseDate: string;
  status: "pendente" | "pago" | "rejeitado" | "cancelado";
  receiptUrl: string | null;
  protocol: string | null;
  authorizerName: string | null;
  unidentifiedAuthorizer: boolean;
  alcadaStatus: AlcadaStatus | null;
  /** Nova versão (Etapa 6) — só exibido quando difere de amountCents (spec 13.1). */
  authorizedAmountCents: number | null;
};

export function ExpenseList({
  rows,
  canCancel,
  canDecide,
}: {
  rows: ExpenseRow[];
  canCancel: boolean;
  canDecide: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-brand-graphite dark:text-slate-400">
        Nenhuma despesa registrada.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pessoa</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Autorizador</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Comprovante</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Decisão</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium text-brand-navy dark:text-slate-50">
              {row.personName}
              {row.protocol && (
                <span className="block text-xs font-normal text-brand-graphite/60">
                  {row.protocol}
                </span>
              )}
            </TableCell>
            <TableCell>{expenseCategoryLabels[row.category]}</TableCell>
            <TableCell>
              {row.authorizerName ?? (
                <span className="text-brand-graphite/60">—</span>
              )}
              {row.unidentifiedAuthorizer && (
                <span className="block text-xs font-normal text-amber-600">
                  não identificado no sistema
                </span>
              )}
              {row.alcadaStatus && (
                <Badge variant={ALCADA_VARIANT[row.alcadaStatus]} className="mt-1">
                  {ALCADA_LABEL[row.alcadaStatus]}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              {formatCentsAsBRL(row.amountCents)}
              {row.authorizedAmountCents !== null &&
                row.authorizedAmountCents !== row.amountCents && (
                  <span className="block text-xs font-normal text-amber-600">
                    autorizado: {formatCentsAsBRL(row.authorizedAmountCents)}
                  </span>
                )}
            </TableCell>
            <TableCell>
              {new Date(row.expenseDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
            </TableCell>
            <TableCell>
              {row.receiptUrl ? (
                <a
                  href={row.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-navy underline-offset-4 hover:underline dark:text-slate-50"
                >
                  Ver
                </a>
              ) : (
                <span className="text-brand-graphite/60">Indisponível</span>
              )}
            </TableCell>
            <TableCell>
              <ExpenseStatusBadge status={row.status} />
            </TableCell>
            <TableCell>
              <ExpenseDecisionForm
                expenseId={row.id}
                status={row.status}
                canCancel={canCancel}
                canDecide={canDecide}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
