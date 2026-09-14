import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PeopleSearchForm } from "@/components/pessoas/people-search-form";
import {
  PeopleTable,
  type PersonListRow,
} from "@/components/pessoas/people-table";
import { PaginationControls } from "@/components/pessoas/pagination-controls";

export const metadata: Metadata = { title: "Pessoas" };

const PAGE_SIZE = 20;

export default async function PessoasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  let query = supabase
    .from("people")
    .select("id, full_name, social_name, cpf, status", { count: "exact" })
    .order("full_name", { ascending: true })
    .range(from, to);

  const trimmedQuery = q?.trim();
  if (trimmedQuery) {
    // .or() monta uma string bruta delimitada por vírgula — sanitizar
    // caracteres que quebrariam a sintaxe antes de interpolar.
    const safeName = trimmedQuery.replace(/[%,()]/g, "");
    const digits = trimmedQuery.replace(/\D/g, "");
    query =
      digits.length >= 3
        ? query.or(`full_name.ilike.%${safeName}%,cpf.ilike.%${digits}%`)
        : query.ilike("full_name", `%${safeName}%`);
  }

  const { data, count, error } = await query;
  const people = (data ?? []) as PersonListRow[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Pessoas"
        description="Cadastro único de pessoas da campanha, documentos e validação."
      />
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PeopleSearchForm defaultValue={q} />
        <Button asChild>
          <Link href="/pessoas/novo">Nova pessoa</Link>
        </Button>
      </div>
      <Card>
        <CardContent className="p-0 sm:p-0">
          {error ? (
            <p className="p-6 text-sm text-red-600" role="alert">
              Não foi possível carregar a lista de pessoas.
            </p>
          ) : (
            <div className="p-6">
              <PeopleTable people={people} />
              <PaginationControls
                basePath="/pessoas"
                q={q}
                page={page}
                totalPages={totalPages}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
