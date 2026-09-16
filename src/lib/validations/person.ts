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
  rg: z.string().trim().max(20).optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  email: z
    .union([z.literal(""), z.email({ error: "Informe um e-mail válido." })])
    .optional(),
});
export type PersonInput = z.infer<typeof personSchema>;

/**
 * Endereço: só o CEP é obrigatório (é o único campo NOT NULL que sobra em
 * person_addresses, migração 0047) — rua/bairro/cidade/UF e o texto único
 * `fullAddress` (quando a fonte não separa isso, ex.: planilha real de
 * importação com só "Endereço Completo") são todos opcionais e podem vir em
 * qualquer combinação, inclusive nenhum deles. Já foi mais restrito (exigia
 * "conjunto completo ou fullAddress"), mas dados reais de importação vêm
 * frequentemente só com CEP — travar por isso perdia o resto do cadastro à toa.
 */
export const addressSchema = z.object({
  zipCode: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 8, { error: "CEP deve conter 8 dígitos." }),
  street: z.string().trim().max(200).optional().or(z.literal("")),
  number: z.string().trim().max(20).optional().or(z.literal("")),
  complement: z.string().trim().max(100).optional().or(z.literal("")),
  neighborhood: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  state: z.string().length(2, { error: "UF deve ter 2 letras." }).optional().or(z.literal("")),
  fullAddress: z.string().trim().max(300).optional().or(z.literal("")),
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

/**
 * Veículo próprio usado no trabalho de campanha (marca/modelo/placa/renavam)
 * — mesmo padrão all-or-nothing das demais seções opcionais. Regex de placa
 * frouxo de propósito (aceita padrão antigo ABC1234 e Mercosul ABC1D23);
 * renavam sem dígito verificador (o órgão de trânsito valida isso, não é
 * papel deste sistema).
 */
export const vehicleSchema = z.object({
  brand: z.string().trim().min(1, { error: "Informe a marca do veículo." }).max(60),
  model: z.string().trim().min(1, { error: "Informe o modelo do veículo." }).max(60),
  plate: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
    .refine((v) => /^[A-Z0-9]{6,8}$/.test(v), { error: "Placa inválida." }),
  renavam: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 9 && v.length <= 11, { error: "Renavam deve ter entre 9 e 11 dígitos." }),
});
export type VehicleInput = z.infer<typeof vehicleSchema>;

/**
 * Liderança comunitária / indicação / tipo de contratação — texto livre, sem
 * campo obrigatório (a seção inteira é opcional; `isSectionEmpty` decide se
 * grava). Mesmo nível de acesso das demais satélites (person_engagement_data,
 * migração 0047) — decisão explícita do usuário, sem camada extra de
 * restrição apesar de "liderança"/"indicação" revelarem atuação política.
 */
export const engagementSchema = z.object({
  leadershipNote: z.string().trim().max(300).optional().or(z.literal("")),
  referralName: z.string().trim().max(200).optional().or(z.literal("")),
  contractingTypeNote: z.string().trim().max(100).optional().or(z.literal("")),
});
export type EngagementInput = z.infer<typeof engagementSchema>;

export const documentTypes = [
  "rg",
  "cnh",
  "cpf",
  "comprovante_residencia",
  "titulo_eleitor",
  "carteira_trabalho",
  "comprovante_bancario",
  "contrato",
  "certidao",
  "outro",
] as const;

export const documentTypeLabels: Record<
  (typeof documentTypes)[number],
  string
> = {
  rg: "RG",
  cnh: "CNH",
  cpf: "CPF",
  comprovante_residencia: "Comprovante de residência",
  titulo_eleitor: "Título de eleitor",
  carteira_trabalho: "Carteira de trabalho",
  comprovante_bancario: "Comprovante bancário",
  contrato: "Contrato",
  certidao: "Certidão",
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
