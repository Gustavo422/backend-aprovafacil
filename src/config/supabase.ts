import { createClient } from '@supabase/supabase-js';
import express from 'express';

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

console.log('SUPABASE_URL em uso:', supabaseUrl);

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

// Endpoint temporário para teste descartável
if (process.env.NODE_ENV !== 'production') {
  const app = express();
  app.get('/test-supabase', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id')
        .limit(1);
      res.json({
        SUPABASE_URL: supabaseUrl,
        success: !error,
        error: error ? error.message : null,
        data
      });
    } catch (err) {
      res.status(500).json({
        SUPABASE_URL: supabaseUrl,
        success: false,
        error: err instanceof Error ? err.message : err
      });
    }
  });
  app.listen(5050, () => {
    console.log('Teste Supabase rodando em http://localhost:5050/test-supabase');
  });
}

// Tipos para o Supabase
export type Database = {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          nome: string;
          email: string;
          ultimo_login: string | null;
          criado_em: string;
          atualizado_em: string;
          total_questoes_respondidas: number;
          total_resposta_corretas: number;
          tempo_estudo_minutos: number;
          pontuacao_media: number;
        };
        Insert: {
          id?: string;
          nome: string;
          email: string;
          ultimo_login?: string | null;
          criado_em?: string;
          atualizado_em?: string;
          total_questoes_respondidas?: number;
          total_resposta_corretas?: number;
          tempo_estudo_minutos?: number;
          pontuacao_media?: number;
        };
        Update: {
          id?: string;
          nome?: string;
          email?: string;
          ultimo_login?: string | null;
          criado_em?: string;
          atualizado_em?: string;
          total_questoes_respondidas?: number;
          total_resposta_corretas?: number;
          tempo_estudo_minutos?: number;
          pontuacao_media?: number;
        };
      };
      concursos: {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          ano: number;
          banca: string;
          ativo: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string | null;
          ano: number;
          banca: string;
          ativo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          descricao?: string | null;
          ano?: number;
          banca?: string;
          ativo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
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



