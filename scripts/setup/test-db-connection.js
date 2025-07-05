import { createClient } from '@supabase/supabase-js';

// Configuração do cliente Supabase
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para testar a conexão
async function testConnection() {
  console.log('Testando conexão com o banco de dados...');
  
  try {
    // Tenta listar as tabelas disponíveis
    const { data: tables, error } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (error) {
      console.error('Erro ao acessar o banco de dados:', error);
      return;
    }
    
    console.log('Conexão bem-sucedida! Tabelas disponíveis:');
    console.log(tables);
  } catch (err) {
    console.error('Erro ao testar a conexão:', err);
  }
}

testConnection();
