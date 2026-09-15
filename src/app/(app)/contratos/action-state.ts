export type ContractActionState = {
  status: "idle" | "error" | "success";
  errors?: Partial<Record<string, string[]>>;
  message?: string;
};

export const initialContractActionState: ContractActionState = {
  status: "idle",
};

/**
 * Resultado de `sendContractAccess()` — mensagem pronta pra copiar/
 * mandar por WhatsApp/e-mail, com senha só quando um login novo foi
 * criado agora (nunca reexibida depois).
 */
export type SendContractAccessState = {
  status: "idle" | "error" | "success";
  message?: string;
  contractLink?: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  tempPassword?: string;
  isNewLogin?: boolean;
};

export const initialSendContractAccessState: SendContractAccessState = {
  status: "idle",
};
