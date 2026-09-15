import { z } from "zod";

import { isValidCnpj, sanitizeCnpj } from "./cnpj";
import { isValidCpf, sanitizeCpf } from "./cpf";

/** Campos da própria organização — compartilhados entre criação e edição (spec 7.1/7.2). */
export const organizationFieldsSchema = z.object({
  name: z.string().trim().min(3, { error: "Informe o nome da organização." }).max(200),
  documentNumber: z
    .string()
    .transform(sanitizeCnpj)
    .refine((v) => v.length === 14, { error: "CNPJ deve conter 14 dígitos." })
    .refine(isValidCnpj, { error: "CNPJ inválido." }),
  legalName: z.string().trim().max(200).optional().or(z.literal("")),
  tradeName: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.email({ error: "Informe um e-mail válido." }).trim().toLowerCase().optional().or(z.literal("")),
  // Endereço do escritório/sede — cabeçalho/rodapé do contrato impresso
  // (spec 7.2). Tudo opcional: a organização pode não ter preenchido
  // ainda, diferente do endereço de uma pessoa (person.ts#addressSchema),
  // que é obrigatório quando a seção é preenchida.
  zipCode: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 0 || v.length === 8, { error: "CEP deve conter 8 dígitos." })
    .optional()
    .or(z.literal("")),
  street: z.string().trim().max(200).optional().or(z.literal("")),
  number: z.string().trim().max(20).optional().or(z.literal("")),
  complement: z.string().trim().max(100).optional().or(z.literal("")),
  neighborhood: z.string().trim().max(100).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v.length === 0 || v.length === 2, { error: "UF deve ter 2 letras." })
    .optional()
    .or(z.literal("")),
  // Representante legal da entidade contratante — qualificação do
  // contrato (caderno jurídico, seções 10/15: "representado por
  // {{campaign_legal_entity.representante_nome}}, CPF nº
  // {{campaign_legal_entity.representante_cpf}}"). Opcional aqui pelo
  // mesmo motivo do endereço — pode não estar preenchido ainda.
  representativeName: z.string().trim().max(200).optional().or(z.literal("")),
  representativeCpf: z
    .string()
    .trim()
    .transform(sanitizeCpf)
    .refine((v) => v.length === 0 || v.length === 11, { error: "CPF deve conter 11 dígitos." })
    .refine((v) => v.length === 0 || isValidCpf(v), { error: "CPF do representante inválido." })
    .optional()
    .or(z.literal("")),
});

export const createOrganizationSchema = organizationFieldsSchema.extend({
  adminFullName: z
    .string()
    .trim()
    .min(3, { error: "Informe o nome completo do administrador." })
    .max(200),
  adminEmail: z.email({ error: "Informe um e-mail válido." }).trim().toLowerCase(),
  adminPhone: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v.replace(/\D/g, "").length >= 6, {
      error: "Informe um telefone com pelo menos 6 dígitos (vira a senha inicial).",
    }),
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = organizationFieldsSchema;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const addOrganizationAdminSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, { error: "Informe o nome completo." })
    .max(200),
  email: z.email({ error: "Informe um e-mail válido." }).trim().toLowerCase(),
  phone: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v.replace(/\D/g, "").length >= 6, {
      error: "Informe um telefone com pelo menos 6 dígitos (vira a senha inicial).",
    }),
});
export type AddOrganizationAdminInput = z.infer<typeof addOrganizationAdminSchema>;
