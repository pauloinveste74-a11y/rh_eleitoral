export interface UserActionState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
  /**
   * Senha inicial/resetada (últimos dígitos do telefone — ver
   * `src/lib/temp-password.ts`), para o admin compartilhar manualmente
   * por WhatsApp/e-mail — ver `src/components/usuarios/share-credentials.tsx`.
   * Só preenchida em `inviteUser`/`resetUserPassword`.
   */
  tempPassword?: string;
  recipientEmail?: string;
  recipientPhone?: string | null;
}

export const initialUserActionState: UserActionState = { status: "idle" };
