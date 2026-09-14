/**
 * Tipo e valor inicial do estado de useActionState para os formulários de
 * Financeiro. Um arquivo "use server" só pode exportar funções async — por
 * isso o valor inicial vive aqui.
 */
export type PaymentActionState = {
  status: "idle" | "error" | "success";
  errors?: Partial<Record<string, string[]>>;
  message?: string;
};

export const initialPaymentActionState: PaymentActionState = { status: "idle" };
