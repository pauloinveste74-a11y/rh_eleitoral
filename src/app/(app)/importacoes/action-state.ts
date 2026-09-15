export type ImportBatchActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const initialImportBatchActionState: ImportBatchActionState = {
  status: "idle",
};
