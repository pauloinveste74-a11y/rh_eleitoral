import { z } from "zod";

/**
 * Cargo/função de trabalho configurável por campanha (Nova versão, spec
 * seção 4.1) — distinto de `roles` (perfil de acesso). Ver
 * `supabase/migrations/0029_nova_versao_cargos_e_pessoa_juridica.sql`.
 */
export const contractTypes = ["pf", "pj"] as const;
export const contractTypeLabels: Record<(typeof contractTypes)[number], string> = {
  pf: "Pessoa física",
  pj: "Pessoa jurídica",
};

export const jobFunctionSchema = z
  .object({
    name: z.string().trim().min(1, { error: "Informe o nome do cargo." }).max(150),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    category: z.string().trim().max(100).optional().or(z.literal("")),
    contractType: z.enum(contractTypes, { error: "Selecione o tipo de contratação." }),
    workloadReference: z.string().trim().max(200).optional().or(z.literal("")),
    salaryRangeMinReais: z.string().trim().optional().or(z.literal("")),
    salaryRangeMaxReais: z.string().trim().optional().or(z.literal("")),
    requiresCoordinator: z
      .string()
      .optional()
      .transform((v) => v === "true"),
  })
  .transform((data) => ({
    ...data,
    salaryRangeMinCents:
      data.salaryRangeMinReais && !Number.isNaN(Number(data.salaryRangeMinReais))
        ? Math.round(Number(data.salaryRangeMinReais) * 100)
        : null,
    salaryRangeMaxCents:
      data.salaryRangeMaxReais && !Number.isNaN(Number(data.salaryRangeMaxReais))
        ? Math.round(Number(data.salaryRangeMaxReais) * 100)
        : null,
  }))
  .refine(
    (data) =>
      data.salaryRangeMinCents === null ||
      data.salaryRangeMaxCents === null ||
      data.salaryRangeMaxCents >= data.salaryRangeMinCents,
    { error: "O valor máximo da faixa não pode ser menor que o mínimo.", path: ["salaryRangeMaxReais"] },
  );
export type JobFunctionInput = z.infer<typeof jobFunctionSchema>;
