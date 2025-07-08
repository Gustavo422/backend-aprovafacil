import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuração do Supabase
const supabaseUrl = process.env['SUPABASE_URL'];
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️ Variáveis de ambiente do Supabase não configuradas - usando valores padrão para desenvolvimento');
    console.warn('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.warn('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
    // Não sair do processo em desenvolvimento
    if (process.env['NODE_ENV'] === 'production') {
        process.exit(1);
    }
}

// Cliente Supabase para operações do servidor
export const supabase = createClient(supabaseUrl || 'https://example.supabase.co', supabaseServiceKey || 'dummy-key', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Cliente Supabase para operações do cliente (browser)
const supabaseAnonKey = process.env['SUPABASE_ANON_KEY'];

if (!supabaseAnonKey) {
  console.warn('❌ SUPABASE_ANON_KEY não configurada');
  // Não sair do processo em desenvolvimento
  if (process.env['NODE_ENV'] === 'production') {
    process.exit(1);
  }
}

export const supabaseClient = createClient(supabaseUrl || 'https://example.supabase.co', supabaseAnonKey || 'dummy-key');

// Tipos para o Supabase
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          nome: string | null;
          role: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          nome?: string | null;
          role?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nome?: string | null;
          role?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      concursos: {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          ano: number;
          banca: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string | null;
          ano: number;
          banca: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          descricao?: string | null;
          ano?: number;
          banca?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Adicione outras tabelas conforme necessário
    };
  };
};

// Exportar objeto default para compatibilidade
export default {
  supabase,
  supabaseClient
}; 