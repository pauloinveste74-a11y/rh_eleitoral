export type LegalEntityActionState = {
  status: "idle" | "error" | "success";
  errors?: Partial<Record<string, string[]>>;
  message?: string;
};

export const initialLegalEntityActionState: LegalEntityActionState = {
  status: "idle",
};
