/**
 * Tipo e valor inicial do estado de useActionState para os formulários de
 * Pessoas. Um arquivo "use server" só pode exportar funções async — por
 * isso o valor inicial (um objeto simples) vive aqui, fora de actions.ts.
 */
export type PersonActionState = {
  status: "idle" | "error" | "success";
  errors?: Partial<Record<string, string[]>>;
  message?: string;
};

export const initialPersonActionState: PersonActionState = { status: "idle" };
