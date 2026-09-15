import { z } from "zod";

import { contractTypes, contractTypeLabels } from "./job-function";

/**
 * Gestão de contratos (Nova versão, spec seção 12 — migração 0032).
 * `contractTypes`/`contractTypeLabels` (pf/pj) são os mesmos de
 * job-function.ts — reexportados daqui pra quem só importa este arquivo,
 * sem duplicar a constante.
 */
export { contractTypes, contractTypeLabels };

export const contractTemplateSchema = z.object({
  name: z.string().trim().min(1, { error: "Informe o nome do modelo." }).max(200),
  contractType: z.enum(contractTypes, { error: "Selecione o tipo de contratado." }),
  jobFunctionId: z.string().trim().optional().or(z.literal("")),
});
export type ContractTemplateInput = z.infer<typeof contractTemplateSchema>;

export const publishVersionSchema = z.object({
  body: z
    .string()
    .trim()
    .min(20, { error: "O conteúdo do modelo é muito curto." })
    .max(20000),
  validFrom: z.string().trim().min(1, { error: "Informe a data de início de vigência." }),
  validUntil: z.string().trim().optional().or(z.literal("")),
});
export type PublishVersionInput = z.infer<typeof publishVersionSchema>;

export const legalApprovalSchema = z.object({
  approved: z.enum(["true", "false"], { error: "Selecione aprovar ou reprovar." }),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});
export type LegalApprovalInput = z.infer<typeof legalApprovalSchema>;

/**
 * Geração individual — a checagem "exatamente pessoa OU empresa" é feita na
 * action (cross-field, mesmo padrão de outros formulários do projeto que
 * não usam superRefine pra isso — ex.: expense-form).
 */
export const generateContractSchema = z.object({
  templateVersionId: z.uuid({ error: "Selecione um modelo." }),
  personId: z.string().trim().optional().or(z.literal("")),
  legalEntityId: z.string().trim().optional().or(z.literal("")),
  jobFunctionId: z.string().trim().optional().or(z.literal("")),
  positionOverride: z.string().trim().max(120).optional().or(z.literal("")),
  valueReais: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
      error: "Informe um valor válido.",
    }),
  startDate: z.string().trim().optional().or(z.literal("")),
  endDate: z.string().trim().optional().or(z.literal("")),
});
export type GenerateContractInput = z.infer<typeof generateContractSchema>;

export const CONTRACT_STATUS_LABEL: Record<string, string> = {
  aguardando_geracao: "Aguardando geração",
  gerado: "Gerado",
  disponivel: "Disponível",
  baixado: "Baixado",
  aguardando_assinatura: "Aguardando assinatura",
  assinado_enviado: "Assinatura enviada",
  em_conferencia: "Em conferência",
  correcao_solicitada: "Correção solicitada",
  assinado_e_validado: "Assinado e validado",
  recusado: "Recusado",
  substituido: "Substituído",
  encerrado: "Encerrado",
};

export const CONTRACT_STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "destructive" | "secondary"
> = {
  aguardando_geracao: "secondary",
  gerado: "secondary",
  disponivel: "secondary",
  baixado: "warning",
  aguardando_assinatura: "warning",
  assinado_enviado: "warning",
  em_conferencia: "warning",
  correcao_solicitada: "destructive",
  assinado_e_validado: "success",
  recusado: "destructive",
  substituido: "secondary",
  encerrado: "secondary",
};

/** Placeholders sugeridos ao criar um modelo — mesma lista da spec (seção 12.1). */
export const CONTRACT_PLACEHOLDERS_PF = [
  "nome_contratado",
  "cpf",
  "rg",
  "endereco_completo",
  "telefone",
  "email",
  "funcao",
  "cidade",
  "eixo",
  "coordenador",
  "data_inicio",
  "data_fim",
  "valor_contratado",
] as const;

export const CONTRACT_PLACEHOLDERS_PJ = [
  "razao_social",
  "cnpj",
  "representante_legal",
  "representante_cpf",
  "endereco_completo",
  "telefone",
  "email",
  "funcao",
  "data_inicio",
  "data_fim",
  "valor_contratado",
] as const;
