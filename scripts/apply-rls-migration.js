#!/usr/bin/env node

/**
 * Script para aplicar migração de RLS no Supabase
 * 
 * Este script aplica a migração de Row Level Security no banco de dados Supabase
 * e verifica se todas as políticas foram aplicadas corretamente.
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
    
    console.log('📄 Lendo arquivo de migração...')
    
    // Dividir o SQL em comandos individuais
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
    
    console.log(`🔧 Executando ${commands.length} comandos...`)
    
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      
      try {
        console.log(`  [${i + 1}/${commands.length}] Executando comando...`)
        
        const { error } = await supabase.rpc('exec_sql', { sql: command })
        
        if (error) {
          console.error(`    ❌ Erro no comando ${i + 1}:`, error.message)
          errorCount++
        } else {
          console.log(`    ✅ Comando ${i + 1} executado com sucesso`)
          successCount++
        }
      } catch (err) {
        console.error(`    ❌ Erro no comando ${i + 1}:`, err.message)
        errorCount++
      }
    }
    
    console.log('\n📊 Resultado da migração:')
    console.log(`  ✅ Comandos executados com sucesso: ${successCount}`)
    console.log(`  ❌ Comandos com erro: ${errorCount}`)
    
    if (errorCount === 0) {
      console.log('\n🎉 Migração de RLS aplicada com sucesso!')
      
      // Verificar se as políticas foram aplicadas
      await verifyRLSPolicies()
    } else {
      console.log('\n⚠️ Alguns comandos falharam. Verifique os logs acima.')
    }
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error)
    process.exit(1)
  }
}

async function verifyRLSPolicies() {
  console.log('\n🔍 Verificando políticas RLS...')
  
  try {
    // Verificar tabelas com RLS habilitado
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')
    
    if (tablesError) {
      console.error('❌ Erro ao verificar tabelas:', tablesError)
      return
    }
    
    console.log(`📋 Encontradas ${tables.length} tabelas públicas`)
    
    // Verificar políticas em cada tabela
    for (const table of tables) {
      const { data: policies, error: policiesError } = await supabase
        .from('pg_policies')
        .select('policyname, cmd, qual')
        .eq('tablename', table.table_name)
        .eq('schemaname', 'public')
      
      if (policiesError) {
        console.error(`❌ Erro ao verificar políticas da tabela ${table.table_name}:`, policiesError)
        continue
      }
      
      if (policies && policies.length > 0) {
        console.log(`  ✅ ${table.table_name}: ${policies.length} políticas configuradas`)
      } else {
        console.log(`  ⚠️ ${table.table_name}: Nenhuma política configurada`)
      }
    }
    
    console.log('\n✅ Verificação de políticas concluída!')
    
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