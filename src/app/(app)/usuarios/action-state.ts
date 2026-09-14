export interface UserActionState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
}

export const initialUserActionState: UserActionState = { status: "idle" };
