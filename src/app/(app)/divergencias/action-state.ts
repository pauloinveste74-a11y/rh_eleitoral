export interface DivergenceActionState {
  status: "idle" | "success" | "error";
  message?: string;
  aiVerdict?: "confere" | "diverge" | "inconclusivo";
  aiExtractedName?: string | null;
  aiExtractedCpf?: string | null;
  aiExplanation?: string;
}

export const initialDivergenceActionState: DivergenceActionState = { status: "idle" };
