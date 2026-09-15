/**
 * Tipo e valor inicial do estado de useActionState para as decisões da fila
 * de validação do gestor — mesmo padrão de src/app/(app)/aprovacoes/action-state.ts.
 */
export type ValidationActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const initialValidationActionState: ValidationActionState = {
  status: "idle",
};
