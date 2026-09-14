import type { Metadata } from "next";

import { PlaceholderModule } from "@/components/layout/placeholder-module";

export const metadata: Metadata = { title: "Aprovações" };

export default function AprovacoesPage() {
  return (
    <PlaceholderModule
      title="Aprovações"
      description="Fluxo de aprovações de cadastro, contratos, desligamentos e pagamentos."
      plannedPhase="Fase 3 — Fluxos de Aprovação"
    />
  );
}
