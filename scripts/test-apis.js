#!/usr/bin/env node

/**
 * Script para testar todas as APIs implementadas
 * Uso: node scripts/test-apis.js
 */

import fetch from 'node-fetch';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Função para log colorido
const log = (color, message) => {
  console.log(`${color}${message}${colors.reset}`);
};

// Função para testar uma API
const testAPI = async (method, endpoint, data = null, token = null) => {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { body: JSON.stringify(data) })
    };

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const responseData = await response.json();

    return {
      success: response.ok,
      status: response.status,
      data: responseData
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error.message
    };
  }
};

// Função para testar health check
const testHealthCheck = async () => {
  log(colors.blue, '\n🔍 Testando Health Check...');
  
  const result = await testAPI('GET', '/health');
  
  if (result.success) {
    log(colors.green, '✅ Health check funcionando');
    log(colors.yellow, `   Status: ${result.status}`);
    log(colors.yellow, `   Mensagem: ${result.data.message}`);
  } else {
    log(colors.red, '❌ Health check falhou');
    log(colors.red, `   Erro: ${result.error || result.data.error}`);
  }
};

// Função para testar conexão com Supabase
const testSupabaseConnection = async () => {
  log(colors.blue, '\n🔍 Testando Conexão com Supabase...');
  
  const result = await testAPI('GET', '/test-connection');
  
  if (result.success) {
    log(colors.green, '✅ Conexão com Supabase estabelecida');
    log(colors.yellow, `   Status: ${result.status}`);
    log(colors.yellow, `   Mensagem: ${result.data.message}`);
  } else {
    log(colors.red, '❌ Conexão com Supabase falhou');
    log(colors.red, `   Erro: ${result.error || result.data.error}`);
  }
};

// Função para testar APIs de Concursos
const testConcursosAPI = async () => {
  log(colors.blue, '\n🔍 Testando APIs de Concursos...');
  
  // Teste 1: Listar concursos
  log(colors.yellow, '   Testando GET /concursos...');
  const listResult = await testAPI('GET', '/concursos');
  
  if (listResult.success) {
    log(colors.green, '   ✅ Listagem de concursos funcionando');
    log(colors.yellow, `      Total: ${listResult.data.data?.length || 0} concursos`);
  } else {
    log(colors.red, '   ❌ Listagem de concursos falhou');
  }
  
  // Teste 2: Buscar concurso por ID (se existir)
  if (listResult.success && listResult.data.data?.length > 0) {
    const firstConcurso = listResult.data.data[0];
    log(colors.yellow, `   Testando GET /concursos/${firstConcurso.id}...`);
    
    const getResult = await testAPI('GET', `/concursos/${firstConcurso.id}`);
    
    if (getResult.success) {
      log(colors.green, '   ✅ Busca por ID funcionando');
    } else {
      log(colors.red, '   ❌ Busca por ID falhou');
    }
  }
};

// Função para testar APIs de Apostilas
const testApostilasAPI = async () => {
  log(colors.blue, '\n🔍 Testando APIs de Apostilas...');
  
  // Teste 1: Listar apostilas
  log(colors.yellow, '   Testando GET /apostilas...');
  const listResult = await testAPI('GET', '/apostilas');
  
  if (listResult.success) {
    log(colors.green, '   ✅ Listagem de apostilas funcionando');
    log(colors.yellow, `      Total: ${listResult.data.data?.length || 0} apostilas`);
  } else {
    log(colors.red, '   ❌ Listagem de apostilas falhou');
  }
  
  // Teste 2: Buscar apostila por ID (se existir)
  if (listResult.success && listResult.data.data?.length > 0) {
    const firstApostila = listResult.data.data[0];
    log(colors.yellow, `   Testando GET /apostilas/${firstApostila.id}...`);
    
    const getResult = await testAPI('GET', `/apostilas/${firstApostila.id}`);
    
    if (getResult.success) {
      log(colors.green, '   ✅ Busca por ID funcionando');
    } else {
      log(colors.red, '   ❌ Busca por ID falhou');
    }
    
    // Teste 3: Buscar conteúdo da apostila
    log(colors.yellow, `   Testando GET /apostilas/${firstApostila.id}/content...`);
    const contentResult = await testAPI('GET', `/apostilas/${firstApostila.id}/content`);
    
    if (contentResult.success) {
      log(colors.green, '   ✅ Busca de conteúdo funcionando');
      log(colors.yellow, `      Total: ${contentResult.data.data?.length || 0} módulos`);
    } else {
      log(colors.red, '   ❌ Busca de conteúdo falhou');
    }
  }
};

// Função para testar APIs de Flashcards
const testFlashcardsAPI = async () => {
  log(colors.blue, '\n🔍 Testando APIs de Flashcards...');
  
  // Teste 1: Listar flashcards
  log(colors.yellow, '   Testando GET /flashcards...');
  const listResult = await testAPI('GET', '/flashcards');
  
  if (listResult.success) {
    log(colors.green, '   ✅ Listagem de flashcards funcionando');
    log(colors.yellow, `      Total: ${listResult.data.data?.length || 0} flashcards`);
  } else {
    log(colors.red, '   ❌ Listagem de flashcards falhou');
  }
  
  // Teste 2: Buscar flashcard por ID (se existir)
  if (listResult.success && listResult.data.data?.length > 0) {
    const firstFlashcard = listResult.data.data[0];
    log(colors.yellow, `   Testando GET /flashcards/${firstFlashcard.id}...`);
    
    const getResult = await testAPI('GET', `/flashcards/${firstFlashcard.id}`);
    
    if (getResult.success) {
      log(colors.green, '   ✅ Busca por ID funcionando');
    } else {
      log(colors.red, '   ❌ Busca por ID falhou');
    }
  }
};

// Função para testar filtros e paginação
const testFiltersAndPagination = async () => {
  log(colors.blue, '\n🔍 Testando Filtros e Paginação...');
  
  // Teste de filtros em concursos
  log(colors.yellow, '   Testando filtros em /concursos?page=1&limit=5...');
  const filterResult = await testAPI('GET', '/concursos?page=1&limit=5');
  
  if (filterResult.success) {
    log(colors.green, '   ✅ Filtros e paginação funcionando');
    log(colors.yellow, `      Página: ${filterResult.data.pagination?.page}`);
    log(colors.yellow, `      Limite: ${filterResult.data.pagination?.limit}`);
    log(colors.yellow, `      Total: ${filterResult.data.pagination?.total}`);
  } else {
    log(colors.red, '   ❌ Filtros e paginação falharam');
  }
  
  // Teste de busca em apostilas
  log(colors.yellow, '   Testando busca em /apostilas?search=teste...');
  const searchResult = await testAPI('GET', '/apostilas?search=teste');
  
  if (searchResult.success) {
    log(colors.green, '   ✅ Busca funcionando');
  } else {
    log(colors.red, '   ❌ Busca falhou');
  }
};

// Função para testar autenticação (sem token)
const testAuthentication = async () => {
  log(colors.blue, '\n🔍 Testando Autenticação...');
  
  // Teste de rota protegida sem token
  log(colors.yellow, '   Testando POST /concursos (sem autenticação)...');
  const authResult = await testAPI('POST', '/concursos', {
    nome: 'Teste Concurso',
    descricao: 'Concurso de teste'
  });
  
  if (!authResult.success && authResult.status === 401) {
    log(colors.green, '   ✅ Autenticação protegendo rotas corretamente');
  } else {
    log(colors.red, '   ❌ Autenticação não está funcionando');
  }
};

// Função principal
const runTests = async () => {
  log(colors.bold, '\n🚀 Iniciando Testes das APIs');
  log(colors.yellow, `📍 URL Base: ${BASE_URL}`);
  log(colors.yellow, `🔗 API Base: ${API_BASE}`);
  
  try {
    // Testes básicos
    await testHealthCheck();
    await testSupabaseConnection();
    
    // Testes das APIs
    await testConcursosAPI();
    await testApostilasAPI();
    await testFlashcardsAPI();
    
    // Testes de funcionalidades
    await testFiltersAndPagination();
    await testAuthentication();
    
    log(colors.bold + colors.green, '\n✅ Todos os testes concluídos!');
    
  } catch (error) {
    log(colors.bold + colors.red, '\n❌ Erro durante os testes:');
    log(colors.red, error.message);
  }
};

// Executar testes se o script for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests }; 