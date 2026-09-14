import type { Metadata } from "next";

import { PlaceholderModule } from "@/components/layout/placeholder-module";

export const metadata: Metadata = { title: "Pessoas" };

export default function PessoasPage() {
  return (
    <PlaceholderModule
      title="Pessoas"
      description="Cadastro único de pessoas da campanha, documentos e validação."
      plannedPhase="Fase 2 — Cadastro e Documentos"
    />
  );
}
