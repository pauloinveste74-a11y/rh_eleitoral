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
import { ExpenseStatusBadge } from "./expense-status-badge";
import { ExpenseDecisionForm } from "./expense-decision-form";

export type ExpenseRow = {
  id: string;
  personName: string;
  category: keyof typeof expenseCategoryLabels;
  amountCents: number;
  expenseDate: string;
  status: "pendente" | "pago" | "rejeitado" | "cancelado";
  receiptUrl: string | null;
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
      <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
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
          <TableHead>Valor</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Comprovante</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Decisão</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium text-slate-900 dark:text-slate-50">
              {row.personName}
            </TableCell>
            <TableCell>{expenseCategoryLabels[row.category]}</TableCell>
            <TableCell>{formatCentsAsBRL(row.amountCents)}</TableCell>
            <TableCell>
              {new Date(row.expenseDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
            </TableCell>
            <TableCell>
              {row.receiptUrl ? (
                <a
                  href={row.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-slate-900 underline-offset-4 hover:underline dark:text-slate-50"
                >
                  Ver
                </a>
              ) : (
                <span className="text-slate-400">Indisponível</span>
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
