import { createClient } from '@supabase/supabase-js';

// Configuração do cliente Supabase
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para verificar as tabelas usando information_schema
async function checkTables() {
  console.log('Verificando tabelas usando information_schema...');
  
  try {
    // Lista todas as tabelas no esquema público
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public');
    
    if (error) {
      console.error('Erro ao listar tabelas:', error);
      return;
    }
    
    if (tables.length === 0) {
      console.log('Nenhuma tabela encontrada no esquema público.');
      return;
    }
    
    console.log('Tabelas encontradas:');
    tables.forEach(table => {
      console.log(`- ${table.table_name} (${table.table_type})`);
    });
    
  } catch (err) {
    console.error('Erro ao verificar as tabelas:', err);
  }
}

checkTables();
