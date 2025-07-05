import { createClient } from '@supabase/supabase-js';

// Configuração do cliente Supabase
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para verificar se o banco de dados foi inicializado corretamente
async function checkDatabase() {
  console.log('Verificando banco de dados do Supabase...');
  
  try {
    // Tenta listar as extensões disponíveis
    const { data: extensions, error: extError } = await supabase
      .rpc('pg_available_extensions');
    
    if (extError) {
      console.error('Erro ao listar extensões:', extError);
    } else {
      console.log('Extensões disponíveis:');
      console.log(extensions);
    }
    
    // Tenta listar os esquemas
    const { data: schemas, error: schemaError } = await supabase
      .from('pg_catalog.pg_namespace')
      .select('nspname');
    
    if (schemaError) {
      console.error('Erro ao listar esquemas:', schemaError);
    } else {
      console.log('\nEsquemas disponíveis:');
      console.log(schemas);
    }
    
    // Tenta listar as tabelas no esquema público
    const { data: tables, error: tableError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (tableError) {
      console.error('\nErro ao listar tabelas:', tableError);
    } else {
      console.log('\nTabelas no esquema público:');
      console.log(tables);
    }
    
  } catch (err) {
    console.error('Erro ao verificar o banco de dados:', err);
  }
}

checkDatabase();
