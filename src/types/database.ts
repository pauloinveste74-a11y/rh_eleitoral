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
          // Migração 0013 (Etapa 1) — identificação estendida, tudo opcional.
          rg: string | null;
          cnh: string | null;
          documento_orgao_expedidor: string | null;
          documento_uf_expedicao: string | null;
          documento_data_expedicao: string | null;
          nome_mae: string | null;
          nome_pai: string | null;
          nacionalidade: string | null;
          naturalidade: string | null;
          pais_nascimento: string;
          phone_alternate: string | null;
          origin: "autocadastro" | "administrativo" | "importacao_excel";
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
          rg?: string | null;
          cnh?: string | null;
          documento_orgao_expedidor?: string | null;
          documento_uf_expedicao?: string | null;
          documento_data_expedicao?: string | null;
          nome_mae?: string | null;
          nome_pai?: string | null;
          nacionalidade?: string | null;
          naturalidade?: string | null;
          pais_nascimento?: string;
          phone_alternate?: string | null;
          origin?: "autocadastro" | "administrativo" | "importacao_excel";
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
          // Migração 0020/0025 (Etapa 1/7) — autorizador de registro e alçada.
          category_id: string | null;
          purpose: string | null;
          vendor_name: string | null;
          vendor_document: string | null;
          requested_amount_cents: number | null;
          authorized_amount_cents: number | null;
          payment_method:
            | "pix"
            | "transferencia"
            | "dinheiro"
            | "cartao"
            | "boleto"
            | "outro"
            | null;
          purchaser_person_id: string | null;
          authorized_by_profile_id: string | null;
          authorizer_name_snapshot: string | null;
          authorizer_phone_snapshot: string | null;
          authorization_role_snapshot: string | null;
          authorized_at: string | null;
          authorization_channel:
            | "presencial"
            | "whatsapp"
            | "telefone"
            | "sistema"
            | "outro"
            | null;
          protocol: string | null;
          unidentified_authorizer: boolean;
          unidentified_authorizer_name: string | null;
          unidentified_authorizer_phone: string | null;
          unidentified_authorizer_reason: string | null;
          unidentified_authorizer_evidence: string | null;
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
          category_id?: string | null;
          purpose?: string | null;
          vendor_name?: string | null;
          vendor_document?: string | null;
          requested_amount_cents?: number | null;
          authorized_amount_cents?: number | null;
          payment_method?:
            | "pix"
            | "transferencia"
            | "dinheiro"
            | "cartao"
            | "boleto"
            | "outro"
            | null;
          purchaser_person_id?: string | null;
          authorized_by_profile_id?: string | null;
          authorizer_name_snapshot?: string | null;
          authorizer_phone_snapshot?: string | null;
          authorization_role_snapshot?: string | null;
          authorized_at?: string | null;
          authorization_channel?:
            | "presencial"
            | "whatsapp"
            | "telefone"
            | "sistema"
            | "outro"
            | null;
          protocol?: string | null;
          unidentified_authorizer?: boolean;
          unidentified_authorizer_name?: string | null;
          unidentified_authorizer_phone?: string | null;
          unidentified_authorizer_reason?: string | null;
          unidentified_authorizer_evidence?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
        Relationships: [];
      };
      expense_categories: {
        Row: {
          id: string;
          campaign_id: string | null;
          code: string;
          name: string;
          status: "ativa" | "inativa";
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          code: string;
          name: string;
          status?: "ativa" | "inativa";
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["expense_categories"]["Insert"]
        >;
        Relationships: [];
      };
      expense_authorization_rules: {
        Row: {
          id: string;
          campaign_id: string;
          role_id: string | null;
          profile_id: string | null;
          axis_id: string | null;
          city_id: string | null;
          max_amount_cents: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          role_id?: string | null;
          profile_id?: string | null;
          axis_id?: string | null;
          city_id?: string | null;
          max_amount_cents: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["expense_authorization_rules"]["Insert"]
        >;
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
      registration_invites: {
        Row: {
          id: string;
          campaign_id: string;
          token: string;
          contact_name: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          expires_at: string;
          status: RegistrationInviteStatus;
          max_uses: number;
          uses_count: number;
          suggested_axis_id: string | null;
          suggested_city_id: string | null;
          suggested_team_id: string | null;
          suggested_coordinator_person_id: string | null;
          created_by: string | null;
          created_at: string;
          opened_at: string | null;
          submitted_at: string | null;
          cancelled_at: string | null;
          person_id: string | null;
        };
        Insert: {
          id?: string;
          campaign_id?: string;
          token?: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          expires_at: string;
          status?: RegistrationInviteStatus;
          max_uses?: number;
          uses_count?: number;
          suggested_axis_id?: string | null;
          suggested_city_id?: string | null;
          suggested_team_id?: string | null;
          suggested_coordinator_person_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          opened_at?: string | null;
          submitted_at?: string | null;
          cancelled_at?: string | null;
          person_id?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["registration_invites"]["Insert"]
        >;
        Relationships: [];
      };
      coordination_relationships: {
        Row: {
          id: string;
          campaign_id: string;
          subordinate_person_id: string;
          coordinator_person_id: string | null;
          relationship_type:
            | "eixo_para_rh"
            | "cidade_para_eixo"
            | "equipe_para_cidade"
            | "contratado_para_coordenador";
          axis_id: string | null;
          city_id: string | null;
          team_id: string | null;
          valid_from: string;
          valid_until: string | null;
          status: "vigente" | "encerrado";
          source: "autocadastro" | "administrativo" | "importacao_excel" | null;
          created_by: string | null;
          validated_by: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          campaign_id?: string;
          subordinate_person_id: string;
          coordinator_person_id?: string | null;
          relationship_type:
            | "eixo_para_rh"
            | "cidade_para_eixo"
            | "equipe_para_cidade"
            | "contratado_para_coordenador";
          axis_id?: string | null;
          city_id?: string | null;
          team_id?: string | null;
          valid_from?: string;
          valid_until?: string | null;
          status?: "vigente" | "encerrado";
          source?: "autocadastro" | "administrativo" | "importacao_excel" | null;
          created_by?: string | null;
          validated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["coordination_relationships"]["Insert"]
        >;
        Relationships: [];
      };
      registration_submissions: {
        Row: {
          id: string;
          campaign_id: string;
          person_id: string;
          invite_id: string | null;
          import_batch_id: string | null;
          origin: "autocadastro" | "administrativo" | "importacao_excel";
          status: RegistrationSubmissionStatus;
          submitted_at: string | null;
          manager_person_id: string | null;
          validated_at: string | null;
          validated_by: string | null;
          rejection_reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string;
          person_id: string;
          invite_id?: string | null;
          import_batch_id?: string | null;
          origin: "autocadastro" | "administrativo" | "importacao_excel";
          status?: RegistrationSubmissionStatus;
          submitted_at?: string | null;
          manager_person_id?: string | null;
          validated_at?: string | null;
          validated_by?: string | null;
          rejection_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["registration_submissions"]["Insert"]
        >;
        Relationships: [];
      };
      import_batches: {
        Row: {
          id: string;
          campaign_id: string;
          template_version: string;
          original_file_name: string;
          storage_path: string;
          file_hash: string;
          created_by: string | null;
          created_at: string;
          total_rows: number;
          valid_rows: number;
          imported_rows: number;
          duplicate_rows: number;
          rejected_rows: number;
          pending_rows: number;
          error_rows: number;
          status: "staging" | "preview" | "confirmado" | "revertido" | "cancelado";
          confirmed_at: string | null;
          confirmed_by: string | null;
          reverted_at: string | null;
          reverted_by: string | null;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          template_version: string;
          original_file_name: string;
          storage_path: string;
          file_hash: string;
          created_by?: string | null;
          created_at?: string;
          total_rows?: number;
          valid_rows?: number;
          imported_rows?: number;
          duplicate_rows?: number;
          rejected_rows?: number;
          pending_rows?: number;
          error_rows?: number;
          status?: "staging" | "preview" | "confirmado" | "revertido" | "cancelado";
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          reverted_at?: string | null;
          reverted_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["import_batches"]["Insert"]>;
        Relationships: [];
      };
      import_staging_records: {
        Row: {
          id: string;
          batch_id: string;
          row_number: number;
          raw_data: Json;
          normalized_data: Json | null;
          result:
            | "pronta"
            | "importada"
            | "incompleta"
            | "invalida"
            | "duplicada_arquivo"
            | "ja_existente"
            | "possivel_duplicidade"
            | "conflitante"
            | "pendente_decisao"
            | "rejeitada";
          person_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          row_number: number;
          raw_data: Json;
          normalized_data?: Json | null;
          result?:
            | "pronta"
            | "importada"
            | "incompleta"
            | "invalida"
            | "duplicada_arquivo"
            | "ja_existente"
            | "possivel_duplicidade"
            | "conflitante"
            | "pendente_decisao"
            | "rejeitada";
          person_id?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["import_staging_records"]["Insert"]
        >;
        Relationships: [];
      };
      import_row_errors: {
        Row: {
          id: string;
          staging_record_id: string;
          field_name: string | null;
          error_code: string;
          error_message: string;
        };
        Insert: {
          id?: string;
          staging_record_id: string;
          field_name?: string | null;
          error_code: string;
          error_message: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["import_row_errors"]["Insert"]
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
          p_category_id?: string | null;
          p_purpose?: string | null;
          p_vendor_name?: string | null;
          p_vendor_document?: string | null;
          p_payment_method?: string | null;
          p_purchaser_person_id?: string | null;
          p_authorized_by_profile_id?: string | null;
          p_unidentified_authorizer_name?: string | null;
          p_unidentified_authorizer_phone?: string | null;
          p_unidentified_authorizer_reason?: string | null;
          p_authorization_channel?: string | null;
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
      redeem_registration_invite: {
        Args: { p_token: string };
        Returns: Database["public"]["Tables"]["registration_invites"]["Row"];
      };
      complete_own_registration: {
        Args: {
          p_full_name: string;
          p_cpf: string;
          p_birth_date: string | null;
          p_phone: string | null;
          p_whatsapp: string | null;
          p_email: string | null;
          p_address?: Json | null;
          p_bank?: Json | null;
          p_electoral?: Json | null;
        };
        Returns: string;
      };
      create_team_invite: {
        Args: {
          p_contact_name?: string | null;
          p_contact_phone?: string | null;
          p_contact_email?: string | null;
          p_expires_in_days?: number;
        };
        Returns: Database["public"]["Tables"]["registration_invites"]["Row"];
      };
      submit_public_registration: {
        Args: {
          p_token: string;
          p_full_name: string;
          p_cpf: string;
          p_birth_date: string | null;
          p_phone: string | null;
          p_whatsapp: string | null;
          p_email: string | null;
          p_address?: Json | null;
          p_bank?: Json | null;
          p_electoral?: Json | null;
        };
        Returns: string;
      };
      submit_registration_for_review: {
        Args: { p_person_id: string };
        Returns: string;
      };
      submit_public_registration_for_review: {
        Args: { p_token: string };
        Returns: string;
      };
      decide_registration_submission: {
        Args: {
          p_submission_id: string;
          p_decision: string;
          p_reason?: string | null;
        };
        Returns: undefined;
      };
      decide_rh_validation: {
        Args: {
          p_submission_id: string;
          p_decision: string;
          p_reason?: string | null;
        };
        Returns: undefined;
      };
      revert_import_batch: {
        Args: { p_batch_id: string };
        Returns: undefined;
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
  | "arquivado"
  // Etapa 2 (migração 0013) — fluxo de autocadastro/validação do gestor.
  | "aguardando_gestor"
  | "em_conferencia"
  | "correcao_solicitada"
  | "reenviado"
  | "divergente"
  | "aprovado_gestor"
  | "aguardando_rh"
  | "validado";

/** Status de `registration_invites` (migração 0014). */
export type RegistrationInviteStatus =
  | "criado"
  | "enviado"
  | "acessado"
  | "em_preenchimento"
  | "concluido"
  | "expirado"
  | "cancelado";

/** Status de `registration_submissions` (migração 0016). */
export type RegistrationSubmissionStatus =
  | "rascunho"
  | "em_preenchimento"
  | "documentos_pendentes"
  | "enviado"
  | "aguardando_validacao_gestor"
  | "em_conferencia"
  | "correcao_solicitada"
  | "reenviado"
  | "divergente"
  | "aprovado_gestor"
  | "aguardando_rh"
  | "validado"
  | "rejeitado"
  | "suspenso"
  | "arquivado";
