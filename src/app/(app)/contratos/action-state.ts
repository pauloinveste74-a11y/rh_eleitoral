export type ContractActionState = {
  status: "idle" | "error" | "success";
  errors?: Partial<Record<string, string[]>>;
  message?: string;
};

export const initialContractActionState: ContractActionState = {
  status: "idle",
};
