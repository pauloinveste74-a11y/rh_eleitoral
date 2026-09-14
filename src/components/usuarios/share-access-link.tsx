"use client";

import { useState } from "react";

import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";

export function ShareAccessLink({
  link,
  email,
  phone,
}: {
  link: string;
  email: string;
  phone?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const message = `Você foi convidado(a) para o RH Eleitoral. Acesse o link para definir sua senha: ${link}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API pode falhar (permissão, contexto não seguro) —
      // o link continua selecionável manualmente no campo abaixo.
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Link de acesso gerado para <strong>{email}</strong>. Nenhum e-mail é
        enviado automaticamente — compartilhe por um dos canais abaixo.
      </p>
      <input
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? "Copiado!" : "Copiar link"}
        </Button>
        {phone && (
          <Button type="button" variant="outline" size="sm" asChild>
            <a
              href={buildWhatsAppLink(phone, message)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Enviar por WhatsApp
            </a>
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" asChild>
          <a
            href={`mailto:${email}?subject=${encodeURIComponent("Acesso ao RH Eleitoral")}&body=${encodeURIComponent(message)}`}
          >
            Enviar por e-mail
          </a>
        </Button>
      </div>
    </div>
  );
}
