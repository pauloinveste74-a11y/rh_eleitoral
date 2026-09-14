import type { Metadata } from "next";

import { PlaceholderModule } from "@/components/layout/placeholder-module";

export const metadata: Metadata = { title: "Despesas" };

export default function DespesasPage() {
  return (
    <PlaceholderModule
      title="Despesas"
      description="Ordens de despesa, reembolsos e controle de combustível."
      plannedPhase="Fase 6 — Despesas, Reembolsos e Combustível"
    />
  );
}
