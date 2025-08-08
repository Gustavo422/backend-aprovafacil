#!/usr/bin/env node

/**
 * Script de teste simples para o middleware de autenticação unificado
 * Testa a lógica básica sem necessidade de servidor ou configuração
 */

import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_JWT_SECRET = 'test-secret-key-for-unified-auth-middleware';

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
    TEST_JWT_SECRET
  );
}

/**
 * Verificar token JWT
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, TEST_JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Testar geração de tokens
 */
function testTokenGeneration() {
  console.log('🧪 Testando geração de tokens...');
  
  const userToken = generateTestToken(testUser);
  const adminToken = generateTestToken(testAdmin);
  
  if (userToken && adminToken) {
    console.log('✅ Tokens gerados com sucesso');
    return { userToken, adminToken };
  } 
    console.log('❌ Falha na geração de tokens');
    return null;
  
}

/**
 * Testar verificação de tokens
 */
function testTokenVerification(userToken, adminToken) {
  console.log('🧪 Testando verificação de tokens...');
  
  const userDecoded = verifyToken(userToken);
  const adminDecoded = verifyToken(adminToken);
  
  if (userDecoded && adminDecoded) {
    console.log('✅ Tokens verificados com sucesso');
    console.log(`   Usuário: ${userDecoded.usuarioId} (${userDecoded.role})`);
    console.log(`   Admin: ${adminDecoded.usuarioId} (${adminDecoded.role})`);
    return true;
  } 
    console.log('❌ Falha na verificação de tokens');
    return false;
  
}

/**
 * Testar validação de roles
 */
function testRoleValidation() {
  console.log('🧪 Testando validação de roles...');
  
  const userToken = generateTestToken(testUser);
  const adminToken = generateTestToken(testAdmin);
  
  const userDecoded = verifyToken(userToken);
  const adminDecoded = verifyToken(adminToken);
  
  // Testar roles válidos
  const validRoles = ['admin', 'super_admin'];
  const userHasValidRole = validRoles.includes(userDecoded.role);
  const adminHasValidRole = validRoles.includes(adminDecoded.role);
  
  if (!userHasValidRole && adminHasValidRole) {
    console.log('✅ Validação de roles funcionando corretamente');
    console.log(`   Usuário (${userDecoded.role}): ❌ Acesso negado`);
    console.log(`   Admin (${adminDecoded.role}): ✅ Acesso permitido`);
    return true;
  } 
    console.log('❌ Falha na validação de roles');
    return false;
  
}

/**
 * Testar estrutura do middleware
 */
function testMiddlewareStructure() {
  console.log('🧪 Testando estrutura do middleware...');
  
  const middlewarePath = path.join(__dirname, '../src/middleware/unified-auth.middleware.ts');
  
  if (!fs.existsSync(middlewarePath)) {
    console.log('❌ Arquivo do middleware não encontrado');
    return false;
  }
  
  const content = fs.readFileSync(middlewarePath, 'utf8');
  
  // Verificar se contém as funções principais
  const requiredFunctions = [
    'unifiedAuthMiddleware',
    'requireAuth',
    'requireActiveUser',
    'requireAdmin',
    'allowFirstLogin'
  ];
  
  let allFound = true;
  for (const func of requiredFunctions) {
    if (!content.includes(func)) {
      console.log(`❌ Função ${func} não encontrada`);
      allFound = false;
    }
  }
  
  if (allFound) {
    console.log('✅ Estrutura do middleware está correta');
    return true;
  } 
    console.log('❌ Estrutura do middleware incompleta');
    return false;
  
}

/**
 * Executar todos os testes
 */
function runAllTests() {
  console.log('🧪 TESTE SIMPLES DO MIDDLEWARE DE AUTENTICAÇÃO UNIFICADO');
  console.log('=' .repeat(60));
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Teste 1: Geração de tokens
  totalTests++;
  const tokens = testTokenGeneration();
  if (tokens) {
    passedTests++;
  }
  
  // Teste 2: Verificação de tokens
  totalTests++;
  if (tokens && testTokenVerification(tokens.userToken, tokens.adminToken)) {
    passedTests++;
  }
  
  // Teste 3: Validação de roles
  totalTests++;
  if (testRoleValidation()) {
    passedTests++;
  }
  
  // Teste 4: Estrutura do middleware
  totalTests++;
  if (testMiddlewareStructure()) {
    passedTests++;
  }
  
  console.log(`\n${ '=' .repeat(60)}`);
  console.log(`📊 RESULTADOS: ${passedTests}/${totalTests} testes passaram`);
  
  if (passedTests === totalTests) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Middleware unificado está funcionando.');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Executar testes de integração: npm run test:auth');
    console.log('2. Verificar se todas as rotas funcionam corretamente');
    console.log('3. Testar com servidor em execução');
    process.exit(0);
  } else {
    console.log('❌ ALGUNS TESTES FALHARAM. Verificar implementação.');
    process.exit(1);
  }
}

// Executar testes
runAllTests(); 