import { z } from "zod";

import { isValidCpf, sanitizeCpf } from "./cpf";

/**
 * Schemas usados tanto no client (valores do React Hook Form, sempre string)
 * quanto no server (Object.fromEntries(formData), também sempre string) —
 * um único schema por entidade evita desvio entre validação client/server.
 */

export const personSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, { error: "Informe o nome completo." })
    .max(200),
  socialName: z.string().trim().max(200).optional().or(z.literal("")),
  cpf: z
    .string()
    .transform(sanitizeCpf)
    .refine((v) => v.length === 11, { error: "CPF deve conter 11 dígitos." })
    .refine(isValidCpf, { error: "CPF inválido." }),
  birthDate: z.string().optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  email: z
    .union([z.literal(""), z.email({ error: "Informe um e-mail válido." })])
    .optional(),
});
export type PersonInput = z.infer<typeof personSchema>;

export const addressSchema = z.object({
  zipCode: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 8, { error: "CEP deve conter 8 dígitos." }),
  street: z.string().trim().min(1, { error: "Informe o logradouro." }),
  number: z.string().trim().max(20).optional().or(z.literal("")),
  complement: z.string().trim().max(100).optional().or(z.literal("")),
  neighborhood: z.string().trim().min(1, { error: "Informe o bairro." }),
  city: z.string().trim().min(1, { error: "Informe a cidade." }),
  state: z.string().length(2, { error: "UF deve ter 2 letras." }),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const bankAccountSchema = z.object({
  bankCode: z
    .string()
    .regex(/^\d{3}$/, { error: "Código do banco deve ter 3 dígitos." }),
  bankName: z.string().trim().max(100).optional().or(z.literal("")),
  agency: z.string().trim().min(1, { error: "Informe a agência." }),
  agencyDigit: z.string().trim().max(2).optional().or(z.literal("")),
  accountNumber: z
    .string()
    .trim()
    .min(1, { error: "Informe o número da conta." }),
  accountDigit: z.string().trim().max(2).optional().or(z.literal("")),
  accountType: z.enum(["corrente", "poupanca"], {
    error: "Selecione o tipo de conta.",
  }),
  pixKeyType: z
    .enum(["cpf", "email", "telefone", "aleatoria"])
    .optional()
    .or(z.literal("")),
  pixKey: z.string().trim().max(140).optional().or(z.literal("")),
});
export type BankAccountInput = z.infer<typeof bankAccountSchema>;

export const electoralDataSchema = z.object({
  voterId: z
    .string()
    .regex(/^\d{12}$/, { error: "Título de eleitor deve ter 12 dígitos." })
    .optional()
    .or(z.literal("")),
  electoralZone: z.string().trim().max(20).optional().or(z.literal("")),
  electoralSection: z.string().trim().max(20).optional().or(z.literal("")),
  voterCity: z.string().trim().max(120).optional().or(z.literal("")),
  voterState: z.string().length(2).optional().or(z.literal("")),
});
export type ElectoralDataInput = z.infer<typeof electoralDataSchema>;

export const documentTypes = [
  "rg",
  "cpf",
  "comprovante_residencia",
  "titulo_eleitor",
  "carteira_trabalho",
  "outro",
] as const;

export const documentTypeLabels: Record<
  (typeof documentTypes)[number],
  string
> = {
  rg: "RG",
  cpf: "CPF",
  comprovante_residencia: "Comprovante de residência",
  titulo_eleitor: "Título de eleitor",
  carteira_trabalho: "Carteira de trabalho",
  outro: "Outro",
};

export const documentUploadSchema = z.object({
  documentType: z.enum(documentTypes, {
    error: "Selecione o tipo de documento.",
  }),
});

/** Campos de uma seção opcional (endereço/banco/eleitoral): true se todos vazios. */
export function isSectionEmpty(
  values: Record<string, string | undefined>,
): boolean {
  return Object.values(values).every((v) => !v || v.trim() === "");
}
