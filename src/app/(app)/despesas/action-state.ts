/**
 * Tipo e valor inicial do estado de useActionState para os formulários de
 * Despesas. Um arquivo "use server" só pode exportar funções async — por
 * isso o valor inicial vive aqui.
 */
export type ExpenseActionState = {
  status: "idle" | "error" | "success";
  errors?: Partial<Record<string, string[]>>;
  message?: string;
};

export const initialExpenseActionState: ExpenseActionState = { status: "idle" };
