/**
 * Tipos do esquema Supabase escritos manualmente para a Fase 1A.
 *
 * ATENÇÃO: assim que o projeto Supabase estiver configurado, regenere este
 * arquivo a partir do banco real para garantir que ele nunca fique
 * dessincronizado do schema:
 *
 *   npx supabase gen types typescript --project-id <ID> > src/types/database.ts
 *
 * Mantenha a mesma exportação (`Database`) para que src/lib/supabase/*.ts
 * continue funcionando sem alterações.
 *
 * `Relationships: []` é exigido pelo tipo genérico do postgrest-js mesmo
 * quando escrito à mão sem chaves estrangeiras mapeadas explicitamente.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      campaigns: {
        Row: {
          id: string;
          name: string;
          slug: string;
          status: "ativa" | "encerrada" | "arquivada";
        } & Timestamps;
        Insert: Partial<Timestamps> & {
          id?: string;
          name: string;
          slug: string;
          status?: "ativa" | "encerrada" | "arquivada";
        };
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Insert"]>;
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Insert"]>;
        Relationships: [];
      };
      axes: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          code: string;
          status: "ativo" | "inativo";
        } & Timestamps;
        Insert: Partial<Timestamps> & {
          id?: string;
          campaign_id: string;
          name: string;
          code: string;
          status?: "ativo" | "inativo";
        };
        Update: Partial<Database["public"]["Tables"]["axes"]["Insert"]>;
        Relationships: [];
      };
      cities: {
        Row: {
          id: string;
          axis_id: string;
          campaign_id: string;
          name: string;
          state: string;
          is_administrative_region: boolean;
          status: "ativo" | "inativo";
        } & Timestamps;
        Insert: Partial<Timestamps> & {
          id?: string;
          axis_id: string;
          campaign_id?: string;
          name: string;
          state: string;
          is_administrative_region?: boolean;
          status?: "ativo" | "inativo";
        };
        Update: Partial<Database["public"]["Tables"]["cities"]["Insert"]>;
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          city_id: string;
          campaign_id: string;
          name: string;
          status: "ativo" | "inativo";
        } & Timestamps;
        Insert: Partial<Timestamps> & {
          id?: string;
          city_id: string;
          campaign_id?: string;
          name: string;
          status?: "ativo" | "inativo";
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
        Relationships: [];
      };
      people: {
        Row: {
          id: string;
          campaign_id: string;
          full_name: string;
          social_name: string | null;
          cpf: string;
          birth_date: string | null;
          phone: string | null;
          whatsapp: string | null;
          email: string | null;
          status: PersonStatus;
          created_by: string | null;
          updated_by: string | null;
        } & Timestamps;
        Insert: Partial<Timestamps> & {
          id?: string;
          campaign_id?: string;
          full_name: string;
          social_name?: string | null;
          cpf: string;
          birth_date?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          status?: PersonStatus;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["people"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          campaign_id: string | null;
          is_platform_admin: boolean;
          person_id: string | null;
          full_name: string;
          email: string;
          phone: string | null;
          status: "ativo" | "suspenso" | "inativo";
        } & Timestamps;
        Insert: Partial<Timestamps> & {
          id: string;
          campaign_id?: string | null;
          is_platform_admin?: boolean;
          person_id?: string | null;
          full_name: string;
          email: string;
          phone?: string | null;
          status?: "ativo" | "suspenso" | "inativo";
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      profile_roles: {
        Row: {
          id: string;
          profile_id: string;
          role_id: string;
          campaign_id: string | null;
          axis_id: string | null;
          city_id: string | null;
          team_id: string | null;
          valid_from: string;
          valid_until: string | null;
          delegated_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          role_id: string;
          campaign_id?: string | null;
          axis_id?: string | null;
          city_id?: string | null;
          team_id?: string | null;
          valid_from?: string;
          valid_until?: string | null;
          delegated_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["profile_roles"]["Insert"]
        >;
        Relationships: [];
      };
      organizational_assignments: {
        Row: {
          id: string;
          person_id: string;
          campaign_id: string;
          axis_id: string | null;
          city_id: string | null;
          team_id: string | null;
          role_id: string | null;
          responsible_person_id: string | null;
          valid_from: string;
          valid_until: string | null;
          status: "vigente" | "encerrado";
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          person_id: string;
          campaign_id: string;
          axis_id?: string | null;
          city_id?: string | null;
          team_id?: string | null;
          role_id?: string | null;
          responsible_person_id?: string | null;
          valid_from?: string;
          valid_until?: string | null;
          status?: "vigente" | "encerrado";
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["organizational_assignments"]["Insert"]
        >;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          campaign_id: string | null;
          occurred_at: string;
          actor_user_id: string | null;
          action: string;
          entity_table: string;
          entity_id: string | null;
          before_data: Json | null;
          after_data: Json | null;
          reason: string | null;
          ip_address: string | null;
          user_agent: string | null;
          related_request_id: string | null;
          approval_id: string | null;
          result: "sucesso" | "falha";
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          occurred_at?: string;
          actor_user_id?: string | null;
          action: string;
          entity_table: string;
          entity_id?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          reason?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          related_request_id?: string | null;
          approval_id?: string | null;
          result?: "sucesso" | "falha";
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      person_addresses: {
        Row: {
          id: string;
          person_id: string;
          campaign_id: string;
          zip_code: string;
          street: string;
          number: string | null;
          complement: string | null;
          neighborhood: string;
          city: string;
          state: string;
          created_by: string | null;
          updated_by: string | null;
        } & Timestamps;
        Insert: Partial<Timestamps> & {
          id?: string;
          person_id: string;
          campaign_id?: string;
          zip_code: string;
          street: string;
          number?: string | null;
          complement?: string | null;
          neighborhood: string;
          city: string;
          state: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["person_addresses"]["Insert"]
        >;
        Relationships: [];
      };
      person_bank_accounts: {
        Row: {
          id: string;
          person_id: string;
          campaign_id: string;
          bank_code: string;
          bank_name: string | null;
          agency: string;
          agency_digit: string | null;
          account_number: string;
          account_digit: string | null;
          account_type: "corrente" | "poupanca";
          pix_key_type: "cpf" | "email" | "telefone" | "aleatoria" | null;
          pix_key: string | null;
          created_by: string | null;
          updated_by: string | null;
        } & Timestamps;
        Insert: Partial<Timestamps> & {
          id?: string;
          person_id: string;
          campaign_id?: string;
          bank_code: string;
          bank_name?: string | null;
          agency: string;
          agency_digit?: string | null;
          account_number: string;
          account_digit?: string | null;
          account_type: "corrente" | "poupanca";
          pix_key_type?: "cpf" | "email" | "telefone" | "aleatoria" | null;
          pix_key?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["person_bank_accounts"]["Insert"]
        >;
        Relationships: [];
      };
      person_electoral_data: {
        Row: {
          id: string;
          person_id: string;
          campaign_id: string;
          voter_id: string | null;
          electoral_zone: string | null;
          electoral_section: string | null;
          voter_city: string | null;
          voter_state: string | null;
          created_by: string | null;
          updated_by: string | null;
        } & Timestamps;
        Insert: Partial<Timestamps> & {
          id?: string;
          person_id: string;
          campaign_id?: string;
          voter_id?: string | null;
          electoral_zone?: string | null;
          electoral_section?: string | null;
          voter_city?: string | null;
          voter_state?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["person_electoral_data"]["Insert"]
        >;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          campaign_id: string;
          person_id: string;
          batch_id: string | null;
          amount_cents: number;
          description: string;
          status: "pendente" | "pago" | "rejeitado" | "cancelado";
          bank_snapshot: Json;
          payment_date: string | null;
          requested_by: string | null;
          decided_by: string | null;
          decided_at: string | null;
          decision_reason: string | null;
        } & Timestamps;
        Insert: Partial<Timestamps> & {
          id?: string;
          campaign_id?: string;
          person_id: string;
          batch_id?: string | null;
          amount_cents: number;
          description: string;
          status?: "pendente" | "pago" | "rejeitado" | "cancelado";
          bank_snapshot: Json;
          payment_date?: string | null;
          requested_by?: string | null;
          decided_by?: string | null;
          decided_at?: string | null;
          decision_reason?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [];
      };
      payment_batches: {
        Row: {
          id: string;
          campaign_id: string;
          reference_period: string;
          description: string;
          amount_cents: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string;
          reference_period: string;
          description: string;
          amount_cents: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["payment_batches"]["Insert"]
        >;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          campaign_id: string;
          person_id: string;
          category:
            | "combustivel"
            | "material"
            | "alimentacao"
            | "transporte"
            | "hospedagem"
            | "outro";
          amount_cents: number;
          description: string;
          expense_date: string;
          receipt_storage_path: string;
          status: "pendente" | "pago" | "rejeitado" | "cancelado";
          payment_date: string | null;
          requested_by: string | null;
          decided_by: string | null;
          decided_at: string | null;
          decision_reason: string | null;
        } & Timestamps;
        Insert: Partial<Timestamps> & {
          id?: string;
          campaign_id?: string;
          person_id: string;
          category:
            | "combustivel"
            | "material"
            | "alimentacao"
            | "transporte"
            | "hospedagem"
            | "outro";
          amount_cents: number;
          description: string;
          expense_date: string;
          receipt_storage_path: string;
          status?: "pendente" | "pago" | "rejeitado" | "cancelado";
          payment_date?: string | null;
          requested_by?: string | null;
          decided_by?: string | null;
          decided_at?: string | null;
          decision_reason?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
        Relationships: [];
      };
      person_documents: {
        Row: {
          id: string;
          person_id: string;
          campaign_id: string;
          document_type:
            | "rg"
            | "cpf"
            | "comprovante_residencia"
            | "titulo_eleitor"
            | "carteira_trabalho"
            | "outro";
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size_bytes: number;
          status: "ativo" | "removido";
          uploaded_by: string | null;
        } & Timestamps;
        Insert: Partial<Timestamps> & {
          id?: string;
          person_id: string;
          campaign_id?: string;
          document_type:
            | "rg"
            | "cpf"
            | "comprovante_residencia"
            | "titulo_eleitor"
            | "carteira_trabalho"
            | "outro";
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size_bytes: number;
          status?: "ativo" | "removido";
          uploaded_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["person_documents"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_campaign_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      has_role: {
        Args: { role_codes: string[] };
        Returns: boolean;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_platform_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_city_coordinator_for: {
        Args: { p_city_id: string };
        Returns: boolean;
      };
      is_axis_coordinator_for: {
        Args: { p_axis_id: string };
        Returns: boolean;
      };
      decide_approval: {
        Args: {
          p_person_id: string;
          p_decision: string;
          p_reason?: string | null;
        };
        Returns: undefined;
      };
      create_payment: {
        Args: {
          p_person_id: string;
          p_amount_cents: number;
          p_description: string;
        };
        Returns: string;
      };
      create_expense: {
        Args: {
          p_person_id: string;
          p_category: string;
          p_amount_cents: number;
          p_description: string;
          p_expense_date: string;
          p_receipt_storage_path: string;
        };
        Returns: string;
      };
      decide_expense: {
        Args: {
          p_expense_id: string;
          p_decision: string;
          p_reason?: string | null;
        };
        Returns: undefined;
      };
      create_payment_batch: {
        Args: {
          p_reference_period: string;
          p_description: string;
          p_amount_cents: number;
          p_person_ids: string[];
        };
        Returns: string;
      };
      decide_payment: {
        Args: {
          p_payment_id: string;
          p_decision: string;
          p_reason?: string | null;
        };
        Returns: undefined;
      };
      log_audit_event: {
        Args: {
          p_action: string;
          p_entity_table: string;
          p_entity_id: string | null;
          p_before_data?: Json | null;
          p_after_data?: Json | null;
          p_reason?: string | null;
          p_result?: string;
          p_related_request_id?: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type PersonStatus =
  | "rascunho"
  | "documentos_pendentes"
  | "documentos_enviados"
  | "ocr_processado"
  | "cadastro_divergente"
  | "pendente_validacao_cidade"
  | "pendente_validacao_eixo"
  | "aprovado"
  | "contrato_pendente"
  | "contrato_enviado"
  | "contrato_assinado"
  | "assinatura_pendente_validacao"
  | "ativo"
  | "suspenso"
  | "desligado"
  | "rejeitado"
  | "arquivado";
