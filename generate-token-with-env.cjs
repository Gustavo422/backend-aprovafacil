require('dotenv').config();
const jwt = require('jsonwebtoken');

function generateTokenWithEnvSecret() {
  try {
    console.log('🧪 Gerando token com JWT_SECRET do ambiente...');
    
    const jwtSecret = process.env.JWT_SECRET;
    console.log('🔑 JWT_SECRET do ambiente:', jwtSecret ? 'Configurado' : 'Não configurado');
    
    if (!jwtSecret) {
      console.log('❌ JWT_SECRET não configurado no ambiente');
      return null;
    }
    
    // Usuário de teste
    const testUser = {
      id: '199cad62-1132-4313-b165-fe049e176239',
      email: 'teste@aprovafacil.com',
      role: 'user'
    };
    
    // Gerar token
    const payload = {
      usuarioId: testUser.id,
      email: testUser.email,
      role: testUser.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 dias
    };
    
    const token = jwt.sign(payload, jwtSecret);
    
    console.log('✅ Token gerado com sucesso!');
    console.log('🎫 Token:', token);
    
    // Verificar se o token é válido
    try {
      const decoded = jwt.verify(token, jwtSecret);
      console.log('✅ Token verificado com sucesso!');
      console.log('📄 Payload:', JSON.stringify(decoded, null, 2));
    } catch (verifyError) {
      console.log('❌ Erro ao verificar token:', verifyError.message);
    }
    
    return token;
    
  } catch (error) {
    console.error('💥 Erro ao gerar token:', error.message);
    return null;
  }
}

const token = generateTokenWithEnvSecret();
console.log('\n🎯 Use este token para testar a API:');
console.log(token); 