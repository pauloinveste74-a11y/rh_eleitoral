"use client";

import { useState, useTransition } from "react";

import { createTemplateFromCatalog } from "@/app/(app)/contratos/modelos/actions";
import { Button } from "@/components/ui/button";

interface CatalogItem {
  id: string;
  code: string;
  contract_type: "pf" | "pj";
  label: string;
}

/**
 * Biblioteca de contratos (Caderno Documental Jurídico, seções 11/12) —
 * atalho pra criar um modelo já com o texto-base sugerido em vez de
 * começar do zero em TemplateForm. O modelo nasce 'rascunho', sem versão
 * publicada — quem clicar revisa o texto pré-preenchido em
 * PublishVersionForm antes de publicar de propósito.
 */
export function CatalogLibrary({ items }: { items: CatalogItem[] }) {
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState(false);

  const pf = items.filter((i) => i.contract_type === "pf");
  const pj = items.filter((i) => i.contract_type === "pj");

  function handleCreate(item: CatalogItem) {
    setPendingId(item.id);
    setErrorById((prev) => ({ ...prev, [item.id]: "" }));
    startTransition(async () => {
      const result = await createTemplateFromCatalog(item.id);
      if (result.status === "error") {
        setErrorById((prev) => ({ ...prev, [item.id]: result.message ?? "Não foi possível criar o modelo." }));
      } else {
        setDoneIds((prev) => new Set(prev).add(item.id));
      }
      setPendingId(null);
    });
  }

  function renderGroup(title: string, group: CatalogItem[]) {
    return (
      <div>
        <p className="mb-2 text-xs font-medium text-brand-graphite dark:text-slate-400">{title}</p>
        <ul className="flex flex-col gap-1">
          {group.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-default px-3 py-2 text-sm dark:border-slate-800"
            >
              <span>
                <span className="text-brand-graphite dark:text-slate-400">{item.code}</span> {item.label}
              </span>
              <div className="flex items-center gap-2">
                {errorById[item.id] && (
                  <span className="text-xs text-red-600" role="alert">
                    {errorById[item.id]}
                  </span>
                )}
                {doneIds.has(item.id) ? (
                  <span className="text-xs text-emerald-600" role="status">
                    Modelo criado — revise abaixo antes de publicar.
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending && pendingId === item.id}
                    onClick={() => handleCreate(item)}
                  >
                    {isPending && pendingId === item.id ? "Criando..." : "Criar modelo com texto sugerido"}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-brand-navy dark:text-slate-50">Biblioteca de contratos</p>
          <p className="text-xs text-brand-graphite dark:text-slate-400">
            31 tipos de contrato pré-nomeados (14 PF + 17 PJ), com texto-base já pronto pra revisar — não
            substitui o modelo em branco abaixo, é só um atalho.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Ocultar" : "Ver biblioteca"}
        </Button>
      </div>
      {expanded && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {renderGroup(`Pessoa física (${pf.length})`, pf)}
          {renderGroup(`Pessoa jurídica (${pj.length})`, pj)}
        </div>
      )}
    </div>
  );
}
