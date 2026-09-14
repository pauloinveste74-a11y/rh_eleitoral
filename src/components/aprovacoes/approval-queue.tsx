import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCpf } from "@/lib/validations/cpf";
import { ApprovalDecisionForm } from "./approval-decision-form";

export type ApprovalQueueRow = {
  id: string;
  fullName: string;
  cpf: string;
  locationLabel: string;
};

export function ApprovalQueue({
  rows,
  emptyMessage,
}: {
  rows: ApprovalQueueRow[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>CPF</TableHead>
          <TableHead>Local</TableHead>
          <TableHead>Decisão</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium text-slate-900 dark:text-slate-50">
              {row.fullName}
            </TableCell>
            <TableCell>{formatCpf(row.cpf)}</TableCell>
            <TableCell>{row.locationLabel}</TableCell>
            <TableCell>
              <ApprovalDecisionForm personId={row.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
