#!/usr/bin/env node

/**
 * Script para testar o middleware de autenticação unificado
 * Substitui os testes manuais dos middlewares antigos
 */

import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET;

// Usuário de teste
const testUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  nome: 'Usuário Teste',
  email: 'teste@aprovafacil.com',
  role: 'user',
  ativo: true,
  primeiro_login: false
};

// Usuário admin de teste
const testAdmin = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  nome: 'Admin Teste',
  email: 'admin@aprovafacil.com',
  role: 'admin',
  ativo: true,
  primeiro_login: false
};

/**
 * Gerar token JWT para teste
 */
function generateTestToken(user) {
  return jwt.sign(
    { 
      usuarioId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hora
    },
    JWT_SECRET
  );
}

/**
 * Testar rota protegida
 */
async function testProtectedRoute(token, expectedStatus = 200) {
  try {
    const response = await fetch(`${BASE_URL}/api/protected/test`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Rota protegida: ${response.status} (esperado: ${expectedStatus})`);
    
    if (response.status !== expectedStatus) {
      console.log(`❌ Status inesperado: ${response.status}`);
      const text = await response.text();
      console.log(`Resposta: ${text}`);
    }

    return response.status === expectedStatus;
  } catch (error) {
    console.log(`❌ Erro ao testar rota protegida: ${error.message}`);
    return false;
  }
}

/**
 * Testar rota admin
 */
async function testAdminRoute(token, expectedStatus = 200) {
  try {
    const response = await fetch(`${BASE_URL}/api/admin/test`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Rota admin: ${response.status} (esperado: ${expectedStatus})`);
    
    if (response.status !== expectedStatus) {
      console.log(`❌ Status inesperado: ${response.status}`);
      const text = await response.text();
      console.log(`Resposta: ${text}`);
    }

    return response.status === expectedStatus;
  } catch (error) {
    console.log(`❌ Erro ao testar rota admin: ${error.message}`);
    return false;
  }
}

/**
 * Testar rota sem autenticação
 */
async function testPublicRoute(expectedStatus = 200) {
  try {
    const response = await fetch(`${BASE_URL}/api/monitor/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Rota pública: ${response.status} (esperado: ${expectedStatus})`);
    
    if (response.status !== expectedStatus) {
      console.log(`❌ Status inesperado: ${response.status}`);
      const text = await response.text();
      console.log(`Resposta: ${text}`);
    }

    return response.status === expectedStatus;
  } catch (error) {
    console.log(`❌ Erro ao testar rota pública: ${error.message}`);
    return false;
  }
}

/**
 * Executar todos os testes
 */
async function runTests() {
  console.log('🧪 TESTANDO MIDDLEWARE DE AUTENTICAÇÃO UNIFICADO');
  console.log('=' .repeat(60));
  
  if (!JWT_SECRET) {
    console.log('❌ JWT_SECRET não configurado');
    process.exit(1);
  }

  let passedTests = 0;
  let totalTests = 0;

  // Teste 1: Rota pública (deve funcionar sem token)
  totalTests++;
  if (await testPublicRoute(200)) {
    passedTests++;
  }

  // Teste 2: Rota protegida sem token (deve falhar)
  totalTests++;
  if (await testProtectedRoute('', 401)) {
    passedTests++;
  }

  // Teste 3: Rota protegida com token inválido (deve falhar)
  totalTests++;
  if (await testProtectedRoute('invalid-token', 401)) {
    passedTests++;
  }

  // Teste 4: Rota protegida com token de usuário válido (deve funcionar)
  const userToken = generateTestToken(testUser);
  totalTests++;
  if (await testProtectedRoute(userToken, 200)) {
    passedTests++;
  }

  // Teste 5: Rota admin com token de usuário normal (deve falhar)
  totalTests++;
  if (await testAdminRoute(userToken, 403)) {
    passedTests++;
  }

  // Teste 6: Rota admin com token de admin válido (deve funcionar)
  const adminToken = generateTestToken(testAdmin);
  totalTests++;
  if (await testAdminRoute(adminToken, 200)) {
    passedTests++;
  }

  // Teste 7: Token expirado (deve falhar)
  const expiredToken = jwt.sign(
    { 
      usuarioId: testUser.id,
      email: testUser.email,
      role: testUser.role,
      iat: Math.floor(Date.now() / 1000) - 7200, // 2 horas atrás
      exp: Math.floor(Date.now() / 1000) - 3600  // 1 hora atrás
    },
    JWT_SECRET
  );
  totalTests++;
  if (await testProtectedRoute(expiredToken, 401)) {
    passedTests++;
  }

  // Teste 8: Token com usuário inativo (deve falhar)
  const inactiveUser = { ...testUser, ativo: false };
  const inactiveToken = generateTestToken(inactiveUser);
  totalTests++;
  if (await testProtectedRoute(inactiveToken, 401)) {
    passedTests++;
  }

  console.log('=' .repeat(60));
  console.log(`📊 RESULTADOS: ${passedTests}/${totalTests} testes passaram`);
  
  if (passedTests === totalTests) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Middleware unificado funcionando corretamente.');
    process.exit(0);
  } else {
    console.log('❌ ALGUNS TESTES FALHARAM. Verificar implementação.');
    process.exit(1);
  }
}

// Executar testes
runTests().catch(error => {
  console.error('❌ Erro ao executar testes:', error);
  process.exit(1);
}); 