import { createClient } from '@supabase/supabase-js';

// Configuração do cliente Supabase
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para listar as tabelas no esquema público
async function listTables() {
  console.log('Listando tabelas no esquema público...');
  
  try {
    // Consulta para listar tabelas no esquema público
    const { data: tables, error } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (error) {
      console.error('Erro ao listar tabelas:', error);
      return;
    }
    
    if (tables.length === 0) {
      console.log('Nenhuma tabela encontrada no esquema público.');
      return;
    }
    
    console.log('Tabelas encontradas:');
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.tablename}`);
    });
    
  } catch (err) {
    console.error('Erro ao listar tabelas:', err);
  }
}

// Executar a listagem
listTables();
