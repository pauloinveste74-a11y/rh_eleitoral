import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCpf } from "@/lib/validations/cpf";
import { ValidationDecisionForm } from "./validation-decision-form";

export type ValidationQueueRow = {
  id: string;
  fullName: string;
  cpf: string;
  origin: "autocadastro" | "administrativo" | "importacao_excel";
  submittedAt: string | null;
};

const ORIGIN_LABEL: Record<ValidationQueueRow["origin"], string> = {
  autocadastro: "Autocadastro",
  administrativo: "Cadastro administrativo",
  importacao_excel: "Importação em lote",
};

export function ValidationQueue({ rows }: { rows: ValidationQueueRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
        Nenhum cadastro aguardando sua validação.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>CPF</TableHead>
          <TableHead>Origem</TableHead>
          <TableHead>Enviado em</TableHead>
          <TableHead>Decisão</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium text-slate-900 dark:text-slate-50">
              {row.fullName}
            </TableCell>
            <TableCell>{row.cpf ? formatCpf(row.cpf) : "—"}</TableCell>
            <TableCell>{ORIGIN_LABEL[row.origin]}</TableCell>
            <TableCell>
              {row.submittedAt
                ? new Date(row.submittedAt).toLocaleDateString("pt-BR")
                : "—"}
            </TableCell>
            <TableCell>
              <ValidationDecisionForm submissionId={row.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
