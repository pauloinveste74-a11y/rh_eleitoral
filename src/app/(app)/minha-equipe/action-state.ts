export interface TeamInviteActionState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
  /** Convite recém-criado — só preenchido em createInvite, pra montar o link compartilhável. */
  invite?: {
    token: string;
    contactName: string | null;
    contactPhone: string | null;
  };
}

export const initialTeamInviteActionState: TeamInviteActionState = {
  status: "idle",
};
