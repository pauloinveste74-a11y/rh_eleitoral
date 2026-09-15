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

/**
 * Resultado de `sendPersonAccess()` — mesmo formato de
 * `SendContractAccessState` (contratos/action-state.ts), adaptado pra
 * pessoa: mensagem pronta pra copiar/mandar por WhatsApp/e-mail, com senha
 * só quando um login novo foi criado agora (nunca reexibida depois).
 */
export type SendPersonAccessState = {
  status: "idle" | "error" | "success";
  message?: string;
  personLink?: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  tempPassword?: string;
  isNewLogin?: boolean;
};

export const initialSendPersonAccessState: SendPersonAccessState = {
  status: "idle",
};
