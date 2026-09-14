import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCentsAsBRL } from "@/lib/validations/payment";
import { PaymentStatusBadge } from "./payment-status-badge";
import { PaymentDecisionForm } from "./payment-decision-form";

export type PaymentRow = {
  id: string;
  personName: string;
  amountCents: number;
  description: string;
  status: "pendente" | "pago" | "rejeitado" | "cancelado";
  date: string;
};

export function PaymentList({
  rows,
  canCancel,
  canDecide,
}: {
  rows: PaymentRow[];
  canCancel: boolean;
  canDecide: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
        Nenhum pagamento registrado.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pessoa</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Decisão</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium text-slate-900 dark:text-slate-50">
              {row.personName}
            </TableCell>
            <TableCell>{formatCentsAsBRL(row.amountCents)}</TableCell>
            <TableCell>{row.description}</TableCell>
            <TableCell>
              <PaymentStatusBadge status={row.status} />
            </TableCell>
            <TableCell>{row.date}</TableCell>
            <TableCell>
              <PaymentDecisionForm
                paymentId={row.id}
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
