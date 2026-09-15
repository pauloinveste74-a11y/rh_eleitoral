/**
 * /meu-cadastro reaproveita o mesmo formato de estado de useActionState de
 * /pessoas (PersonForm é o mesmo componente, só aponta para uma Server
 * Action diferente) — ver `src/app/(app)/pessoas/action-state.ts`.
 */
export type {
  PersonActionState as OwnRegistrationActionState,
} from "@/app/(app)/pessoas/action-state";
export { initialPersonActionState as initialOwnRegistrationActionState } from "@/app/(app)/pessoas/action-state";
