const jwt = require('jsonwebtoken');

function generateTestToken() {
  try {
    console.log('🧪 Gerando token JWT de teste...');
    
    // JWT_SECRET do arquivo .env
    const jwtSecret = "RQPeMLbSA84A1lQO58KE7Gslv6TcCi9MJCvjNlnLWgrFjlonG8fjFZwHt8CFmpmBt6vEuzJiVZk6m/ZajSyagw==";
    
    // Usuário de teste (usando o ID do seu usuário)
    const testUser = {
      id: '199cad62-1132-4313-b165-fe049e176239', // ID do seu usuário
      email: 'seu-email@exemplo.com',
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
    console.log('📄 Payload:', JSON.stringify(payload, null, 2));
    
    // Verificar se o token é válido
    try {
      const decoded = jwt.verify(token, jwtSecret);
      console.log('✅ Token verificado com sucesso!');
      console.log('📄 Payload decodificado:', JSON.stringify(decoded, null, 2));
    } catch (verifyError) {
      console.log('❌ Erro ao verificar token:', verifyError.message);
    }
    
    return token;
    
  } catch (error) {
    console.error('💥 Erro ao gerar token:', error.message);
    return null;
  }
}

const token = generateTestToken();
console.log('\n🎯 Use este token para testar a API:');
console.log(token); 