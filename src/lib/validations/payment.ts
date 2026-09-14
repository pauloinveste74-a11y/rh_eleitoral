import { z } from "zod";

export const paymentSchema = z.object({
  personId: z.uuid({ error: "Selecione a pessoa." }),
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
    .min(3, { error: "Descreva o motivo do pagamento." })
    .max(300),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export function formatCentsAsBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
