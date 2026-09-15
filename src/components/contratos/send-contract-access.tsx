"use client";

import { useState, useTransition } from "react";

import { sendContractAccess, logContractDelivery } from "@/app/(app)/contratos/actions";
import { initialSendContractAccessState } from "@/app/(app)/contratos/action-state";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";

/**
 * Botão "Enviar" ao lado de um contrato — monta o link (+ login/senha
 * novos, se a pessoa ainda não tinha conta) e deixa copiar ou abrir
 * WhatsApp/e-mail. Envio manual por ora (sem provedor pago
 * contratado) — cada clique em WhatsApp/e-mail registra em
 * `contract_deliveries`, já pronta pra quando a automação vier (ver
 * docs/CENTRAL_INTELIGENCIA_RH_MATRIZ.md).
 */
export function SendContractAccess({
  contractId,
  compact = false,
}: {
  contractId: string;
  compact?: boolean;
}) {
  const [state, setState] = useState(initialSendContractAccessState);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  function handleSend() {
    setOpen(true);
    startTransition(async () => {
      const result = await sendContractAccess(contractId);
      setState(result);
    });
  }

  async function handleCopy() {
    if (!state.message) return;
    try {
      await navigator.clipboard.writeText(state.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API pode falhar (permissão, contexto não seguro) — a
      // mensagem continua visível e selecionável no card abaixo.
    }
  }

  function handleChannelClick(channel: "whatsapp" | "email", recipient: string) {
    // Não bloqueia a navegação pro wa.me/mailto — só registra em paralelo.
    void logContractDelivery(contractId, channel, recipient);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {!open && (
        <Button type="button" variant="outline" size={compact ? "sm" : "default"} onClick={handleSend}>
          Enviar
        </Button>
      )}

      {open && isPending && (
        <p className="text-sm text-brand-graphite dark:text-slate-400">Preparando envio...</p>
      )}

      {open && !isPending && state.status === "error" && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}

      {open && !isPending && state.status === "success" && (
        <div className="flex flex-col gap-2 rounded-md border border-border-default p-3 dark:border-slate-800">
          {state.isNewLogin && (
            <p className="text-xs text-state-warning">
              Login criado agora — a senha só aparece esta vez.
            </p>
          )}
          <pre className="whitespace-pre-wrap font-sans text-sm">{state.message}</pre>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "Copiado!" : "Copiar mensagem"}
            </Button>
            {state.recipientPhone && (
              <Button type="button" variant="outline" size="sm" asChild>
                <a
                  href={buildWhatsAppLink(state.recipientPhone, state.message ?? "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleChannelClick("whatsapp", state.recipientPhone!)}
                >
                  Enviar por WhatsApp
                </a>
              </Button>
            )}
            {state.recipientEmail && (
              <Button type="button" variant="outline" size="sm" asChild>
                <a
                  href={`mailto:${state.recipientEmail}?subject=${encodeURIComponent("Seu contrato — RH Eleitoral")}&body=${encodeURIComponent(state.message ?? "")}`}
                  onClick={() => handleChannelClick("email", state.recipientEmail!)}
                >
                  Enviar por e-mail
                </a>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
