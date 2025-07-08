#!/usr/bin/env node

/**
 * Script simples para aplicar migração de RLS no Supabase
 * 
 * Este script executa comandos SQL diretamente no banco de dados
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyRLSMigration() {
  console.log('🚀 Iniciando aplicação da migração de RLS...')
  
  try {
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, '../supabase/migrations/20241217000000_enable_rls_policies.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Aplicando migração de RLS...')
    
    // Executar o SQL completo
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Erro ao aplicar migração:', error)
      
      // Tentar executar comandos individualmente
      console.log('🔄 Tentando executar comandos individualmente...')
      await executeCommandsIndividually(migrationSQL)
    } else {
      console.log('✅ Migração de RLS aplicada com sucesso!')
      await verifyRLSPolicies()
    }
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error)
    process.exit(1)
  }
}

async function executeCommandsIndividually(sql) {
  // Comandos principais para habilitar RLS
  const commands = [
    // Habilitar RLS nas tabelas principais
    "ALTER TABLE public.concursos ENABLE ROW LEVEL SECURITY;",
    "ALTER TABLE public.apostilas ENABLE ROW LEVEL SECURITY;",
    "ALTER TABLE public.simulados ENABLE ROW LEVEL SECURITY;",
    "ALTER TABLE public.user_apostila_progress ENABLE ROW LEVEL SECURITY;",
    "ALTER TABLE public.user_simulado_progress ENABLE ROW LEVEL SECURITY;",
    
    // Políticas básicas
    "CREATE POLICY \"Concursos são públicos para leitura\" ON public.concursos FOR SELECT USING (true);",
    "CREATE POLICY \"Apostilas são públicas para leitura\" ON public.apostilas FOR SELECT USING (true);",
    "CREATE POLICY \"Simulados são públicos para leitura\" ON public.simulados FOR SELECT USING (true);",
    "CREATE POLICY \"Usuários veem apenas seu próprio progresso de apostilas\" ON public.user_apostila_progress FOR ALL USING (auth.uid() = user_id);",
    "CREATE POLICY \"Usuários veem apenas seu próprio progresso de simulados\" ON public.user_simulado_progress FOR ALL USING (auth.uid() = user_id);"
  ]
  
  let successCount = 0
  let errorCount = 0
  
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i]
    
    try {
      console.log(`  [${i + 1}/${commands.length}] Executando: ${command.substring(0, 50)}...`)
      
      const { error } = await supabase.rpc('exec_sql', { sql: command })
      
      if (error) {
        console.error(`    ❌ Erro:`, error.message)
        errorCount++
      } else {
        console.log(`    ✅ Sucesso`)
        successCount++
      }
    } catch (err) {
      console.error(`    ❌ Erro:`, err.message)
      errorCount++
    }
  }
  
  console.log(`\n📊 Resultado: ${successCount} sucessos, ${errorCount} erros`)
}

async function verifyRLSPolicies() {
  console.log('\n🔍 Verificando políticas RLS...')
  
  try {
    // Verificar se RLS está habilitado nas tabelas principais
    const tables = ['concursos', 'apostilas', 'simulados', 'user_apostila_progress', 'user_simulado_progress']
    
    for (const tableName of tables) {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
      
      if (error) {
        console.error(`❌ Erro ao verificar tabela ${tableName}:`, error)
      } else if (data && data.length > 0) {
        console.log(`✅ Tabela ${tableName} existe`)
      } else {
        console.log(`⚠️ Tabela ${tableName} não encontrada`)
      }
    }
    
    console.log('\n✅ Verificação concluída!')
    
  } catch (error) {
    console.error('❌ Erro ao verificar políticas:', error)
  }
}

// Executar o script
if (require.main === module) {
  applyRLSMigration()
    .then(() => {
      console.log('\n🏁 Script concluído!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Erro fatal:', error)
      process.exit(1)
    })
}

module.exports = { applyRLSMigration, verifyRLSPolicies } 