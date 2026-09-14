import type { Metadata } from "next";

import { PlaceholderModule } from "@/components/layout/placeholder-module";

export const metadata: Metadata = { title: "Relatórios" };

export default function RelatoriosPage() {
  return (
    <PlaceholderModule
      title="Relatórios"
      description="Relatórios gerenciais com exportação futura em PDF e Excel."
      plannedPhase="Fase 8 — Relatórios Gerenciais"
    />
  );
}
