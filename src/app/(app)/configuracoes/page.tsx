import type { Metadata } from "next";

import { PlaceholderModule } from "@/components/layout/placeholder-module";

export const metadata: Metadata = { title: "Configurações" };

export default function ConfiguracoesPage() {
  return (
    <PlaceholderModule
      title="Configurações"
      description="Parâmetros da campanha, papéis, delegações e integrações."
      plannedPhase="Contínuo — evolui junto com cada módulo"
    />
  );
}
