"use client";

import { useEffect } from "react";

import { markContractDownloaded } from "@/app/(app)/contratos/actions";
import { Button } from "@/components/ui/button";

/**
 * Visualização/"download" do contrato gerado (spec 12.3) — sem lib de PDF
 * no projeto, o contratado usa Ctrl+P / "Salvar como PDF" do próprio
 * navegador. `mark_contract_downloaded()` é chamado ao abrir a tela (o
 * mais próximo de "fez o download" que dá pra medir sem um evento nativo
 * do browser).
 */
export function ContractPrintView({
  contractId,
  body,
}: {
  contractId: string;
  body: string;
}) {
  useEffect(() => {
    markContractDownloaded(contractId);
  }, [contractId]);

  return (
    <div>
      <div className="mb-3 flex justify-end print:hidden">
        <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
          Imprimir / salvar como PDF
        </Button>
      </div>
      <div className="whitespace-pre-wrap rounded-md border border-border-default bg-white p-6 text-sm leading-relaxed text-brand-navy dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
        {body}
      </div>
    </div>
  );
}
