export type ContractTemplateActionState = {
  status: "idle" | "error" | "success";
  errors?: Partial<Record<string, string[]>>;
  message?: string;
};

export const initialContractTemplateActionState: ContractTemplateActionState = {
  status: "idle",
};
