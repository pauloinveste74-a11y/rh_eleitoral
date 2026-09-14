/**
 * Tipo e valor inicial do estado de useActionState para os formulários de
 * Configurações (gestão territorial). Um arquivo "use server" só pode
 * exportar funções async — por isso o valor inicial vive aqui.
 */
export type TerritoryActionState = {
  status: "idle" | "error" | "success";
  errors?: Partial<Record<string, string[]>>;
  message?: string;
};

export const initialTerritoryActionState: TerritoryActionState = {
  status: "idle",
};
