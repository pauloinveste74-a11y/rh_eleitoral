"use client";

import { useState } from "react";

import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";

export function ShareCredentials({
  email,
  password,
  phone,
  documentNumber,
}: {
  email: string;
  password: string;
  phone?: string | null;
  /** CNPJ da organização, já formatado — soma uma linha no acesso compartilhado quando o login também exige CNPJ (painel do master). */
  documentNumber?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const message =
    `Seu acesso ao RH Eleitoral:\n` +
    `Site: https://rh-eleitoral.vercel.app/login\n` +
    (documentNumber ? `CNPJ: ${documentNumber}\n` : "") +
    `E-mail: ${email}\n` +
    `Senha: ${password}\n\n` +
    `Assim que entrar, recomendamos trocar a senha em "Minha conta".`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API pode falhar (permissão, contexto não seguro) — a
      // senha continua visível e selecionável no campo abaixo.
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border-default p-3 dark:border-slate-800">
      <p className="text-sm text-brand-graphite dark:text-slate-300">
        Acesso criado para <strong>{email}</strong>. Senha inicial:{" "}
        <code className="rounded bg-state-neutral-soft px-1.5 py-0.5 font-mono text-sm dark:bg-slate-900">
          {password}
        </code>{" "}
        — os últimos dígitos do telefone cadastrado. Compartilhe por um dos
        canais abaixo; a pessoa pode trocar a senha depois de entrar.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? "Copiado!" : "Copiar senha"}
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
