import { z } from "zod";

import { isValidCnpj, sanitizeCnpj } from "./cnpj";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(3, { error: "Informe o nome da organização." }).max(200),
  documentNumber: z
    .string()
    .transform(sanitizeCnpj)
    .refine((v) => v.length === 14, { error: "CNPJ deve conter 14 dígitos." })
    .refine(isValidCnpj, { error: "CNPJ inválido." }),
  legalName: z.string().trim().max(200).optional().or(z.literal("")),
  tradeName: z.string().trim().max(200).optional().or(z.literal("")),
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
