import { z } from "zod";

import { sanitizeCnpj } from "./cnpj";

export const loginSchema = z.object({
  documentNumber: z
    .string()
    .transform(sanitizeCnpj)
    .refine((v) => v.length === 14, { error: "Informe o CNPJ da sua organização (14 dígitos)." }),
  email: z.email({ error: "Informe um e-mail válido." }),
  password: z.string().min(1, "Informe a senha."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const setPasswordSchema = z
  .object({
    password: z.string().min(8, { error: "A senha precisa ter ao menos 8 caracteres." }),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    error: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
