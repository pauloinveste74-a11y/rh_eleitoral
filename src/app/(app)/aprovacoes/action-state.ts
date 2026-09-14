/**
 * Tipo e valor inicial do estado de useActionState para as decisões de
 * aprovação. Um arquivo "use server" só pode exportar funções async — por
 * isso o valor inicial vive aqui.
 */
export type ApprovalActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const initialApprovalActionState: ApprovalActionState = {
  status: "idle",
};
