// Hand-written placeholder for `pnpm supabase gen types typescript --linked`.
// Regenerate from the live project once it is linked (see README note in
// tasks/task-02-schema.md §8) — this file must stay structurally in sync
// with supabase/migrations/*.sql until then.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          email: string;
          status: string;
          gumroad_sale_id: string | null;
          license_key: string | null;
          plan: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          status?: string;
          gumroad_sale_id?: string | null;
          license_key?: string | null;
          plan?: string | null;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>;
        Relationships: [];
      };
      onboarding_tokens: {
        Row: {
          token_hash: string;
          tenant_id: string;
          expires_at: string;
          used_at: string | null;
        };
        Insert: {
          token_hash: string;
          tenant_id: string;
          expires_at: string;
          used_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['onboarding_tokens']['Insert']>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          tenant_id: string;
          username: string;
          is_published: boolean | null;
          display_name: string | null;
          headline: string | null;
          avatar_url: string | null;
          theme: Json;
          persona: Json;
          profile_json: Json;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          username: string;
          is_published?: boolean | null;
          display_name?: string | null;
          headline?: string | null;
          avatar_url?: string | null;
          theme?: Json;
          persona?: Json;
          profile_json?: Json;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      entities: {
        Row: {
          id: string;
          profile_id: string;
          kind: string;
          title: string | null;
          body: string | null;
          meta: Json;
          sort_order: number | null;
        };
        Insert: {
          id: string;
          profile_id: string;
          kind: string;
          title?: string | null;
          body?: string | null;
          meta?: Json;
          sort_order?: number | null;
        };
        Update: Partial<Database['public']['Tables']['entities']['Insert']>;
        Relationships: [];
      };
      chunks: {
        Row: {
          id: number;
          profile_id: string;
          entity_id: string;
          content: string;
          embedding: number[] | null;
          tsv: unknown;
          token_count: number | null;
        };
        Insert: {
          id?: number;
          profile_id: string;
          entity_id: string;
          content: string;
          embedding?: number[] | null;
          token_count?: number | null;
        };
        Update: Partial<Database['public']['Tables']['chunks']['Insert']>;
        Relationships: [];
      };
      credentials: {
        Row: {
          tenant_id: string;
          provider: string;
          ciphertext: string;
          iv: string;
          auth_tag: string;
          key_version: number;
          key_last4: string | null;
          validated_at: string | null;
          last_error: string | null;
          last_error_at: string | null;
        };
        Insert: {
          tenant_id: string;
          provider: string;
          ciphertext: string;
          iv: string;
          auth_tag: string;
          key_version?: number;
          key_last4?: string | null;
          validated_at?: string | null;
          last_error?: string | null;
          last_error_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['credentials']['Insert']>;
        Relationships: [];
      };
      usage_counters: {
        Row: {
          profile_id: string;
          day: string;
          messages: number | null;
          cache_hits: number | null;
          tokens_in: number | null;
          tokens_out: number | null;
        };
        Insert: {
          profile_id: string;
          day: string;
          messages?: number | null;
          cache_hits?: number | null;
          tokens_in?: number | null;
          tokens_out?: number | null;
        };
        Update: Partial<Database['public']['Tables']['usage_counters']['Insert']>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: number;
          profile_id: string | null;
          session_id: string;
          role: string;
          content: string | null;
          ui_actions: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          profile_id?: string | null;
          session_id: string;
          role: string;
          content?: string | null;
          ui_actions?: Json | null;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_chunks: {
        Args: {
          p_profile_id: string;
          p_embedding: number[];
          p_query: string;
          p_match_count?: number;
        };
        Returns: {
          chunk_id: number;
          entity_id: string;
          content: string;
          score: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
