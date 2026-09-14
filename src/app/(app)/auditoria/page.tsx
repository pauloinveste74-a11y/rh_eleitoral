import type { Metadata } from "next";

import { PlaceholderModule } from "@/components/layout/placeholder-module";

export const metadata: Metadata = { title: "Auditoria" };

export default function AuditoriaPage() {
  return (
    <PlaceholderModule
      title="Auditoria"
      description="Trilha imutável de ações realizadas no sistema."
      plannedPhase="Fase 7 — Consulta de Auditoria"
    />
  );
}
