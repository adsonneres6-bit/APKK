import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

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
      import_history: {
        Row: {
          id: string;
          user_id: string | null;
          file_name: string;
          total_orders: number;
          total_groups: number;
          checked_groups: number;
          import_time: string;
          export_time: string | null;
          rows_data: Json;
          groups_data: Json;
          headers_data: Json;
          check_state_data: Json;
          created_at: string;
          import_type: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          file_name: string;
          total_orders?: number;
          total_groups?: number;
          checked_groups?: number;
          import_time?: string;
          export_time?: string | null;
          rows_data?: Json;
          groups_data?: Json;
          headers_data?: Json;
          check_state_data?: Json;
          created_at?: string;
          import_type?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          file_name?: string;
          total_orders?: number;
          total_groups?: number;
          checked_groups?: number;
          import_time?: string;
          export_time?: string | null;
          rows_data?: Json;
          groups_data?: Json;
          headers_data?: Json;
          check_state_data?: Json;
          created_at?: string;
          import_type?: string | null;
        };
      };
      app_settings: {
        Row: {
          id: string;
          updated_at: string;
          tutorial_url: string | null;
          tutorial_interface_url: string | null;
          tutorial_flex_url: string | null;
          tutorial_frota_url: string | null;
          apk_circuit_url: string | null;
        };
        Insert: {
          id?: string;
          updated_at?: string;
          tutorial_url?: string | null;
          tutorial_interface_url?: string | null;
          tutorial_flex_url?: string | null;
          tutorial_frota_url?: string | null;
          apk_circuit_url?: string | null;
        };
        Update: {
          id?: string;
          updated_at?: string;
          tutorial_url?: string | null;
          tutorial_interface_url?: string | null;
          tutorial_flex_url?: string | null;
          tutorial_frota_url?: string | null;
          apk_circuit_url?: string | null;
        };
      };
      active_sessions: {
        Row: {
          id: string;
          user_id: string | null;
          file_name: string;
          rows_data: Json;
          groups_data: Json;
          headers_data: Json;
          check_state_data: Json;
          total_orders: number;
          checked_count: number;
          completed: boolean;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id?: string | null;
          file_name: string;
          rows_data?: Json;
          groups_data?: Json;
          headers_data?: Json;
          check_state_data?: Json;
          total_orders?: number;
          checked_count?: number;
          completed?: boolean;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          file_name?: string;
          rows_data?: Json;
          groups_data?: Json;
          headers_data?: Json;
          check_state_data?: Json;
          total_orders?: number;
          checked_count?: number;
          completed?: boolean;
          updated_at?: string;
          created_at?: string;
        };
      };
      global_announcements: {
        Row: {
          id: string;
          title: string;
          message: string;
          is_active: boolean;
          display_location: string;
          show_once_per_user: boolean;
          require_confirmation: boolean;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          message: string;
          is_active?: boolean;
          display_location?: string;
          show_once_per_user?: boolean;
          require_confirmation?: boolean;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          message?: string;
          is_active?: boolean;
          display_location?: string;
          show_once_per_user?: boolean;
          require_confirmation?: boolean;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      announcement_confirmations: {
        Row: {
          id: string;
          user_id: string;
          announcement_id: string;
          confirmed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          announcement_id: string;
          confirmed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          announcement_id?: string;
          confirmed_at?: string;
        };
      };
    };
  };
}
