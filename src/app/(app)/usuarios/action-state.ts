export interface UserActionState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
  /**
   * Link de acesso gerado pelo convite/reenvio (`generateLink()`), para o
   * admin compartilhar manualmente por e-mail/WhatsApp — ver
   * `src/components/usuarios/share-access-link.tsx`. Só preenchido em
   * `inviteUser`/`resendAccessLink`.
   */
  accessLink?: string;
  recipientEmail?: string;
  recipientPhone?: string | null;
}

export const initialUserActionState: UserActionState = { status: "idle" };
