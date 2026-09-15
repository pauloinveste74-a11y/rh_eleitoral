export interface OrganizationActionState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
  organizationId?: string;
  /**
   * Senha inicial do administrador criado (últimos dígitos do telefone
   * — ver `src/lib/temp-password.ts`), pro master compartilhar
   * manualmente — mesmo componente `ShareCredentials` já usado em
   * `/usuarios`.
   */
  tempPassword?: string;
  recipientEmail?: string;
  recipientPhone?: string | null;
  documentNumber?: string | null;
}

export const initialOrganizationActionState: OrganizationActionState = {
  status: "idle",
};
