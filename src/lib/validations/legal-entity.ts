import { z } from "zod";

import { isValidCnpj, sanitizeCnpj } from "./cnpj";
import { isValidCpf, sanitizeCpf } from "./cpf";

/**
 * Cadastro-mestre de pessoa jurídica (Nova versão, spec seção 5.1-PJ).
 * Endereço e dados bancários embutidos (sem satélite) — ver comentário no
 * topo de `supabase/migrations/0029_nova_versao_cargos_e_pessoa_juridica.sql`
 * pro porquê dessa simplificação nesta etapa.
 */
export const legalEntitySchema = z.object({
  companyName: z.string().trim().min(1, { error: "Informe a razão social." }).max(200),
  tradeName: z.string().trim().max(200).optional().or(z.literal("")),
  cnpj: z
    .string()
    .transform(sanitizeCnpj)
    .refine((v) => v.length === 14, { error: "CNPJ deve conter 14 dígitos." })
    .refine(isValidCnpj, { error: "CNPJ inválido." }),
  stateRegistration: z.string().trim().max(30).optional().or(z.literal("")),
  municipalRegistration: z.string().trim().max(30).optional().or(z.literal("")),
  legalRepresentativeName: z
    .string()
    .trim()
    .min(1, { error: "Informe o nome do representante legal." })
    .max(200),
  legalRepresentativeCpf: z
    .string()
    .transform(sanitizeCpf)
    .refine((v) => v.length === 11, { error: "CPF deve conter 11 dígitos." })
    .refine(isValidCpf, { error: "CPF do representante legal inválido." }),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.union([z.literal(""), z.email({ error: "Informe um e-mail válido." })]).optional(),
  serviceDescription: z.string().trim().max(500).optional().or(z.literal("")),
});
export type LegalEntityInput = z.infer<typeof legalEntitySchema>;
