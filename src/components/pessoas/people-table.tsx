import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCpf } from "@/lib/validations/cpf";
import type { PersonStatus } from "@/types/database";
import { PersonStatusBadge } from "./person-status-badge";

export type PersonListRow = {
  id: string;
  full_name: string;
  social_name: string | null;
  cpf: string;
  status: PersonStatus;
};

export function PeopleTable({ people }: { people: PersonListRow[] }) {
  if (people.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
        Nenhuma pessoa encontrada.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>CPF</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {people.map((person) => (
          <TableRow key={person.id}>
            <TableCell className="font-medium text-slate-900 dark:text-slate-50">
              {person.social_name || person.full_name}
            </TableCell>
            <TableCell>{formatCpf(person.cpf)}</TableCell>
            <TableCell>
              <PersonStatusBadge status={person.status} />
            </TableCell>
            <TableCell className="text-right">
              <Link
                href={`/pessoas/${person.id}/editar`}
                className="text-sm font-medium text-slate-900 underline-offset-4 hover:underline dark:text-slate-50"
              >
                Editar
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
