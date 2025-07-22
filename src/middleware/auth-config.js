/**
 * Configuração para o middleware de autenticação
 */
export const authConfig = {
  // Chave secreta para JWT
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  
  // Tempo de expiração do token em segundos
  tokenExpiresIn: 86400, // 24 horas
  
  // Opções de debug
  debug: {
    // Habilitar logs de debug
    enabled: true,
    
    // Mostrar tokens nos logs
    showTokens: false,
    
    // Ignorar verificação de assinatura em ambiente de desenvolvimento
    ignoreSignatureInDev: process.env.NODE_ENV === 'development'
  }
};