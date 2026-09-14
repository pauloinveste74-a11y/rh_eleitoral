import type { Metadata } from "next";

import { PlaceholderModule } from "@/components/layout/placeholder-module";

export const metadata: Metadata = { title: "Ponto" };

export default function PontoPage() {
  return (
    <PlaceholderModule
      title="Ponto"
      description="Registro diário de entrada e saída, jornadas, escalas e banco de horas."
      plannedPhase="Fase 4 — Ponto e Jornadas"
    />
  );
}
