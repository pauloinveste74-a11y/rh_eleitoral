import { Badge } from "@/components/ui/badge";

const FIELD_LABEL: Record<string, string> = {
  nome: "Nome",
  cpf: "CPF",
  data_nascimento: "Data de nascimento",
  telefone: "Telefone",
  email: "E-mail",
  endereco: "Endereço",
};

const FIELD_ORDER = ["nome", "cpf", "data_nascimento", "telefone", "email", "endereco"];

const STATUS_LABEL: Record<string, string> = {
  nao_informado: "Não informado",
  informado: "Informado",
  importado: "Importado",
  extraido: "Extraído",
  compativel: "Compatível",
  complementar: "Complementar",
  divergente: "Divergente",
  pendente: "Pendente",
  validado: "Validado",
  rejeitado: "Rejeitado",
  desatualizado: "Desatualizado",
  bloqueado: "Bloqueado",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "info" | "secondary"> = {
  nao_informado: "secondary",
  informado: "secondary",
  importado: "info",
  extraido: "info",
  compativel: "success",
  complementar: "info",
  divergente: "warning",
  pendente: "warning",
  validado: "success",
  rejeitado: "destructive",
  desatualizado: "warning",
  bloqueado: "destructive",
};

const SOURCE_LABEL: Record<string, string> = {
  cadastro: "Cadastro",
  autocadastro: "Autocadastro",
  administrativo: "Administrativo",
  importacao_excel: "Importação (Excel)",
  importacao_pdf: "Importação (PDF)",
  documento_ocr: "Documento (IA)",
};

interface HistoryEntry {
  id: string;
  previous_value: string | null;
  previous_status: string | null;
  new_value: string | null;
  new_status: string;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
}

interface FieldRow {
  id: string;
  field_name: string;
  value: string | null;
  status: string;
  source: string;
  validated_by: string | null;
  validated_at: string | null;
  updated_at: string;
}

/**
 * Registro mestre por campo (CADERNO_VALIDACAO_DOCUMENTAL_OCR_BASE_MESTRA
 * _RH_ELEITORAL.md, seção 14) — só leitura nesta etapa. Alimentado por
 * backfill (toda pessoa existente) + resolve_data_conflict() quando uma
 * correção de nome é aprovada por duas pessoas diferentes; savePerson()/
 * importação continuam gravando só people/satélites direto (fora de
 * escopo desta etapa, ver docs/VALIDACAO_DOCUMENTAL_MATRIZ.md).
 */
export function MasterFieldRecord({
  fields,
  historyByFieldValueId,
  actorNameById,
}: {
  fields: FieldRow[];
  historyByFieldValueId: Map<string, HistoryEntry[]>;
  actorNameById: Map<string, string>;
}) {
  const byField = new Map(fields.map((f) => [f.field_name, f]));

  if (fields.length === 0) {
    return (
      <p className="text-sm text-brand-graphite dark:text-slate-400">
        Nenhum campo rastreado ainda para esta pessoa.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {FIELD_ORDER.filter((f) => byField.has(f)).map((fieldName) => {
        const row = byField.get(fieldName)!;
        const history = historyByFieldValueId.get(row.id) ?? [];
        return (
          <details
            key={row.id}
            className="rounded-md border border-border-default p-3 text-sm dark:border-slate-800"
          >
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
              <span>
                <span className="font-medium text-brand-navy dark:text-slate-50">
                  {FIELD_LABEL[fieldName] ?? fieldName}
                </span>{" "}
                <span className="text-brand-graphite dark:text-slate-400">{row.value || "—"}</span>
              </span>
              <span className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"} showIcon={false}>
                  {STATUS_LABEL[row.status] ?? row.status}
                </Badge>
                <span className="text-xs text-brand-graphite dark:text-slate-400">
                  {SOURCE_LABEL[row.source] ?? row.source}
                </span>
              </span>
            </summary>
            <div className="mt-2 flex flex-col gap-1 border-t border-border-default pt-2 text-xs text-brand-graphite dark:border-slate-800 dark:text-slate-400">
              {row.validated_by && row.validated_at && (
                <p>
                  Validado por {actorNameById.get(row.validated_by) ?? "—"} em{" "}
                  {new Date(row.validated_at).toLocaleString("pt-BR")}
                </p>
              )}
              {history.length === 0 ? (
                <p>Sem histórico de mudanças.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {history.map((h) => (
                    <li key={h.id}>
                      {new Date(h.created_at).toLocaleString("pt-BR")} —{" "}
                      {h.previous_value ? `"${h.previous_value}"` : "(vazio)"} →{" "}
                      {h.new_value ? `"${h.new_value}"` : "(vazio)"}
                      {h.changed_by && ` · ${actorNameById.get(h.changed_by) ?? "—"}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
