/**
 * Reaproveita o mesmo formato de src/app/(app)/pessoas/action-state.ts — o
 * formulário público (PersonForm) é o mesmo componente da área autenticada.
 */
export type {
  PersonActionState as PublicRegistrationActionState,
} from "@/app/(app)/pessoas/action-state";
export { initialPersonActionState as initialPublicRegistrationActionState } from "@/app/(app)/pessoas/action-state";

export interface PublicDocumentActionState {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Partial<Record<string, string[]>>;
}

export const initialPublicDocumentActionState: PublicDocumentActionState = {
  status: "idle",
};
