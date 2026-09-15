"use client";

import { useState, useTransition } from "react";

import { sendPersonAccess } from "@/app/(app)/pessoas/actions";
import { initialSendPersonAccessState } from "@/app/(app)/pessoas/action-state";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";

/**
 * Botão "Enviar link" em `/pessoas/[id]/editar` — monta o link pra
 * `/meu-cadastro` (+ login/senha novos, se a pessoa ainda não tinha conta)
 * e deixa copiar ou abrir WhatsApp/e-mail. Mesmo padrão de
 * `SendContractAccess` (contratos), sem tabela de tracking de entrega —
 * aqui é só um link de acesso, envio sempre manual.
 */
export function SendPersonAccess({ personId }: { personId: string }) {
  const [state, setState] = useState(initialSendPersonAccessState);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  function handleSend() {
    setOpen(true);
    startTransition(async () => {
      const result = await sendPersonAccess(personId);
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

  return (
    <div className="flex flex-col items-start gap-2">
      {!open && (
        <Button type="button" variant="outline" onClick={handleSend}>
          Enviar link para a pessoa completar os dados
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
                >
                  Enviar por WhatsApp
                </a>
              </Button>
            )}
            {state.recipientEmail && (
              <Button type="button" variant="outline" size="sm" asChild>
                <a
                  href={`mailto:${state.recipientEmail}?subject=${encodeURIComponent("Complete seu cadastro — RH Eleitoral")}&body=${encodeURIComponent(state.message ?? "")}`}
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
