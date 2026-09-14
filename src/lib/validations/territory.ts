import { z } from "zod";

export const axisSchema = z.object({
  name: z.string().trim().min(1, { error: "Informe o nome do eixo." }).max(100),
  code: z
    .string()
    .trim()
    .min(1, { error: "Informe o código do eixo." })
    .max(30)
    .transform((v) => v.toUpperCase()),
});
export type AxisInput = z.infer<typeof axisSchema>;

export const citySchema = z.object({
  axisId: z.uuid({ error: "Selecione o eixo." }),
  name: z
    .string()
    .trim()
    .min(1, { error: "Informe o nome da cidade." })
    .max(100),
  state: z
    .string()
    .trim()
    .length(2, { error: "UF deve ter 2 letras." })
    .transform((v) => v.toUpperCase()),
  isAdministrativeRegion: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});
export type CityInput = z.infer<typeof citySchema>;

export const teamSchema = z.object({
  cityId: z.uuid({ error: "Selecione a cidade." }),
  name: z
    .string()
    .trim()
    .min(1, { error: "Informe o nome da equipe." })
    .max(100),
});
export type TeamInput = z.infer<typeof teamSchema>;

export const sendForApprovalSchema = z.object({
  cityId: z.uuid({ error: "Selecione a cidade." }),
});
export type SendForApprovalInput = z.infer<typeof sendForApprovalSchema>;
