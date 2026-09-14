import type { Metadata } from "next";

import { PlaceholderModule } from "@/components/layout/placeholder-module";

export const metadata: Metadata = { title: "Financeiro" };

export default function FinanceiroPage() {
  return (
    <PlaceholderModule
      title="Financeiro"
      description="Pagamentos, alçadas de aprovação e conciliação bancária."
      plannedPhase="Fase 5 — Financeiro e Pagamentos"
    />
  );
}
