import type { Metadata } from "next";

import { PlaceholderModule } from "@/components/layout/placeholder-module";

export const metadata: Metadata = { title: "Operações" };

export default function OperacoesPage() {
  return (
    <PlaceholderModule
      title="Operações"
      description="Relatórios de campo, atividades, materiais e ocorrências das equipes."
      plannedPhase="Fase 4 — Ponto e Operações de Campo"
    />
  );
}
