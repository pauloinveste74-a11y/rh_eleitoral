import { z } from "zod";

export const inviteUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, { error: "Informe o nome completo." })
    .max(200),
  email: z.email({ error: "Informe um e-mail válido." }).trim().toLowerCase(),
  // Obrigatório agora: a senha inicial é derivada do telefone (ver
  // src/lib/temp-password.ts) — precisa de pelo menos 6 dígitos porque é
  // o mínimo exigido pelo Supabase Auth por padrão.
  phone: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v.replace(/\D/g, "").length >= 6, {
      error: "Informe um telefone com pelo menos 6 dígitos (vira a senha inicial).",
    }),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const updatePhoneSchema = z.object({
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});
export type UpdatePhoneInput = z.infer<typeof updatePhoneSchema>;

/**
 * `coordenador_cidade` exige `cityId`, `coordenador_eixo` exige `axisId` —
 * são os únicos papéis cujas funções de RLS (`is_city_coordinator_for()`/
 * `is_axis_coordinator_for()`) checam o escopo em `profile_roles`. Para os
 * demais papéis, cidade/eixo/equipe são apenas informativos (não afetam
 * RLS hoje).
 */
export const assignRoleSchema = z
  .object({
    roleCode: z.string().trim().min(1, { error: "Selecione um papel." }),
    axisId: z.string().trim().optional(),
    cityId: z.string().trim().optional(),
    teamId: z.string().trim().optional(),
    validUntil: z.string().trim().optional(),
  })
  .refine((v) => v.roleCode !== "coordenador_cidade" || Boolean(v.cityId), {
    error: "Selecione a cidade que este coordenador vai validar.",
    path: ["cityId"],
  })
  .refine((v) => v.roleCode !== "coordenador_eixo" || Boolean(v.axisId), {
    error: "Selecione o eixo que este coordenador vai validar.",
    path: ["axisId"],
  });
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
