import { z } from "zod";

export const expenseCategories = [
  "combustivel",
  "material",
  "alimentacao",
  "transporte",
  "hospedagem",
  "outro",
] as const;

export const expenseCategoryLabels: Record<(typeof expenseCategories)[number], string> = {
  combustivel: "Combustível",
  material: "Material",
  alimentacao: "Alimentação",
  transporte: "Transporte",
  hospedagem: "Hospedagem",
  outro: "Outro",
};

export const expenseSchema = z.object({
  personId: z.uuid({ error: "Selecione a pessoa." }),
  category: z.enum(expenseCategories, { error: "Selecione a categoria." }),
  amountReais: z
    .string()
    .trim()
    .refine((v) => v !== "" && !Number.isNaN(Number(v)) && Number(v) > 0, {
      error: "Informe um valor válido, maior que zero.",
    })
    .transform((v) => Math.round(Number(v) * 100)),
  description: z
    .string()
    .trim()
    .min(3, { error: "Descreva o motivo do reembolso." })
    .max(300),
  expenseDate: z.string().refine((v) => v !== "" && !Number.isNaN(Date.parse(v)), {
    error: "Informe a data da despesa.",
  }),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;
