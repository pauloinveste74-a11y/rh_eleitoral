"use client";

import { useEffect } from "react";

import { markContractDownloaded } from "@/app/(app)/contratos/actions";
import { formatCnpj } from "@/lib/validations/cnpj";
import { Button } from "@/components/ui/button";

export interface ContractOrganizationInfo {
  name: string;
  legalName: string | null;
  documentNumber: string | null;
  email: string | null;
  phone: string | null;
  representativeName: string | null;
  representativeCpf: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}

function formatAddress(org: ContractOrganizationInfo): string | null {
  const parts: string[] = [];
  if (org.street) {
    parts.push(org.number ? `${org.street}, ${org.number}` : org.street);
  }
  if (org.complement) parts.push(org.complement);
  if (org.neighborhood) parts.push(org.neighborhood);
  const cityState = [org.city, org.state].filter(Boolean).join("/");
  if (cityState) parts.push(cityState);
  if (org.zipCode) parts.push(`CEP ${org.zipCode.replace(/(\d{5})(\d{3})/, "$1-$2")}`);
  return parts.length > 0 ? parts.join(" — ") : null;
}

/**
 * Visualização/"download" do contrato gerado (spec 12.3) — sem lib de PDF
 * no projeto, o contratado usa Ctrl+P / "Salvar como PDF" do próprio
 * navegador. `mark_contract_downloaded()` é chamado ao abrir a tela (o
 * mais próximo de "fez o download" que dá pra medir sem um evento nativo
 * do browser).
 *
 * Cabeçalho/rodapé (CADERNO_DOCUMENTAL_JURIDICO_CONTRATOS_RH_ELEITORAL.md,
 * seções 8-9): dados da organização buscados ao vivo (não fazem parte do
 * snapshot imutável do contrato — endereço/telefone do escritório não são
 * cláusula contratual, diferente de valor/prazo/função, que continuam
 * congelados em `generated_body`). Sem numeração de página real (não há
 * lib de PDF nesta etapa) — código do contrato entra no lugar.
 */
export function ContractPrintView({
  contractId,
  body,
  organization,
}: {
  contractId: string;
  body: string;
  organization?: ContractOrganizationInfo | null;
}) {
  useEffect(() => {
    markContractDownloaded(contractId);
  }, [contractId]);

  const address = organization ? formatAddress(organization) : null;
  const contractCode = contractId.slice(0, 8).toUpperCase();

  return (
    <div>
      <div className="mb-3 flex justify-end print:hidden">
        <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
          Imprimir / salvar como PDF
        </Button>
      </div>

      <div className="rounded-md border border-border-default bg-white text-brand-navy dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
        {organization && (
          <div className="border-b border-border-default px-6 py-4 text-center dark:border-slate-800">
            <p className="font-heading text-base font-bold">
              {organization.legalName || organization.name}
            </p>
            {organization.documentNumber && (
              <p className="text-xs text-brand-graphite dark:text-slate-400">
                CNPJ {formatCnpj(organization.documentNumber)}
              </p>
            )}
          </div>
        )}

        <div className="whitespace-pre-wrap p-6 text-sm leading-relaxed">{body}</div>

        {organization && (
          <div className="border-t border-border-default px-6 py-3 text-center text-xs text-brand-graphite dark:border-slate-800 dark:text-slate-400">
            {organization.documentNumber && <span>CNPJ {formatCnpj(organization.documentNumber)}</span>}
            {organization.email && <span> · {organization.email}</span>}
            {organization.phone && <span> · {organization.phone}</span>}
            {address && <p>{address}</p>}
            <p>Contrato {contractCode}</p>
          </div>
        )}
      </div>
    </div>
  );
}
