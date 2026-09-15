export type AlcadaActionState = {
  status: "idle" | "error" | "success";
  errors?: Partial<Record<string, string[]>>;
  message?: string;
};

export const initialAlcadaActionState: AlcadaActionState = { status: "idle" };
