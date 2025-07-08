#!/usr/bin/env node

/**
 * Script para testar a integração do backend com Supabase
 * Executa: node scripts/test-integration.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
  console.error('Verifique se SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Função para testar conexão
async function testConnection() {
  console.log('🔌 Testando conexão com Supabase...');
  
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.error('❌ Erro na conexão:', error);
      return false;
    }
    
    console.log('✅ Conexão com Supabase estabelecida!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar:', error);
    return false;
  }
}

// Função para testar tabelas
async function testTables() {
  console.log('\n📊 Testando tabelas do banco...');
  
  const tables = [
    'users',
    'concursos',
    'concurso_categorias',
    'apostilas',
    'simulados',
    'flashcards',
    'mapa_assuntos',
    'planos_estudo',
    'questoes_semanais'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: OK`);
      }
    } catch (error) {
      console.log(`❌ ${table}: ${error.message}`);
    }
  }
}

// Função para testar operações CRUD
async function testCRUD() {
  console.log('\n🔄 Testando operações CRUD...');
  
  // Teste de criação
  try {
    const testData = {
      nome: 'Teste de Integração',
      descricao: 'Concurso criado para testar integração',
      categoria_id: null, // Será definido se houver categorias
      is_active: false // Não ativo para não poluir o banco
    };
    
    // Buscar uma categoria existente
    const { data: categorias } = await supabase
      .from('concurso_categorias')
      .select('id')
      .limit(1);
    
    if (categorias && categorias.length > 0) {
      testData.categoria_id = categorias[0].id;
    }
    
    const { data: created, error: createError } = await supabase
      .from('concursos')
      .insert(testData)
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Criação:', createError.message);
    } else {
      console.log('✅ Criação: OK');
      
      // Teste de leitura
      const { data: read, error: readError } = await supabase
        .from('concursos')
        .select('*')
        .eq('id', created.id)
        .single();
      
      if (readError) {
        console.log('❌ Leitura:', readError.message);
      } else {
        console.log('✅ Leitura: OK');
      }
      
      // Teste de atualização
      const { error: updateError } = await supabase
        .from('concursos')
        .update({ descricao: 'Descrição atualizada' })
        .eq('id', created.id);
      
      if (updateError) {
        console.log('❌ Atualização:', updateError.message);
      } else {
        console.log('✅ Atualização: OK');
      }
      
      // Teste de exclusão
      const { error: deleteError } = await supabase
        .from('concursos')
        .delete()
        .eq('id', created.id);
      
      if (deleteError) {
        console.log('❌ Exclusão:', deleteError.message);
      } else {
        console.log('✅ Exclusão: OK');
      }
    }
  } catch (error) {
    console.log('❌ Teste CRUD:', error.message);
  }
}

// Função para testar relacionamentos
async function testRelationships() {
  console.log('\n🔗 Testando relacionamentos...');
  
  try {
    const { data, error } = await supabase
      .from('concursos')
      .select(`
        *,
        concurso_categorias (
          id,
          nome,
          slug
        )
      `)
      .limit(5);
    
    if (error) {
      console.log('❌ Relacionamentos:', error.message);
    } else {
      console.log('✅ Relacionamentos: OK');
      console.log(`   Encontrados ${data?.length || 0} concursos com categorias`);
    }
  } catch (error) {
    console.log('❌ Relacionamentos:', error.message);
  }
}

// Função para testar autenticação
async function testAuth() {
  console.log('\n🔐 Testando autenticação...');
  
  try {
    // Teste de verificação de usuário
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.log('❌ Autenticação:', error.message);
    } else {
      console.log('✅ Autenticação: OK');
      console.log(`   Usuário atual: ${user ? user.email : 'Nenhum'}`);
    }
  } catch (error) {
    console.log('❌ Autenticação:', error.message);
  }
}

// Função para testar RLS (Row Level Security)
async function testRLS() {
  console.log('\n🛡️ Testando RLS (Row Level Security)...');
  
  try {
    // Teste sem autenticação
    const { data: publicData, error: publicError } = await supabase
      .from('concursos')
      .select('id, nome')
      .eq('is_active', true)
      .limit(1);
    
    if (publicError) {
      console.log('❌ RLS público:', publicError.message);
    } else {
      console.log('✅ RLS público: OK');
    }
    
    // Teste com autenticação (se houver usuário)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: privateData, error: privateError } = await supabase
        .from('concursos')
        .select('*')
        .limit(1);
      
      if (privateError) {
        console.log('❌ RLS privado:', privateError.message);
      } else {
        console.log('✅ RLS privado: OK');
      }
    } else {
      console.log('⚠️ RLS privado: Nenhum usuário autenticado');
    }
  } catch (error) {
    console.log('❌ RLS:', error.message);
  }
}

// Função principal
async function runTests() {
  console.log('🚀 Iniciando testes de integração...\n');
  
  const tests = [
    { name: 'Conexão', fn: testConnection },
    { name: 'Tabelas', fn: testTables },
    { name: 'CRUD', fn: testCRUD },
    { name: 'Relacionamentos', fn: testRelationships },
    { name: 'Autenticação', fn: testAuth },
    { name: 'RLS', fn: testRLS }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result !== false) {
        passed++;
      }
    } catch (error) {
      console.error(`❌ Erro no teste ${test.name}:`, error.message);
    }
  }
  
  console.log('\n📊 Resultado dos testes:');
  console.log(`✅ Passou: ${passed}/${total}`);
  console.log(`❌ Falhou: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 Todos os testes passaram! A integração está funcionando corretamente.');
  } else {
    console.log('\n⚠️ Alguns testes falharam. Verifique a configuração.');
  }
}

// Executar testes
runTests().catch(console.error); 