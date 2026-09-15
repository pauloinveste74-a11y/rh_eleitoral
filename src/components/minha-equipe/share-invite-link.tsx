"use client";

import { useState } from "react";

import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";

/** Mesmo padrão de src/components/usuarios/share-credentials.tsx, com link de convite em vez de senha. */
export function ShareInviteLink({
  token,
  contactName,
  contactPhone,
}: {
  token: string;
  contactName?: string | null;
  contactPhone?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const link = `https://rh-eleitoral.vercel.app/cadastro/${token}`;

  const message =
    `${contactName ? `Olá, ${contactName}! ` : "Olá! "}` +
    `Complete seu cadastro para a campanha pelo link abaixo — leva alguns ` +
    `minutos e você vai precisar de um documento com foto:\n${link}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API pode falhar (permissão, contexto não seguro) — o
      // link continua visível e selecionável no campo abaixo.
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border-default p-3 dark:border-slate-800">
      <p className="text-sm text-brand-graphite dark:text-slate-300">
        Convite criado{contactName ? ` para ${contactName}` : ""}. Link de
        cadastro (válido por 7 dias):
      </p>
      <code className="break-all rounded bg-state-neutral-soft px-1.5 py-1 font-mono text-xs dark:bg-slate-900">
        {link}
      </code>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? "Copiado!" : "Copiar link"}
        </Button>
        {contactPhone && (
          <Button type="button" variant="outline" size="sm" asChild>
            <a
              href={buildWhatsAppLink(contactPhone, message)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Enviar por WhatsApp
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
