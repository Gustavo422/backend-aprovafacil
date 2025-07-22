/**
 * Middleware para depurar requisições
 */
export function debugRequestMiddleware(req, res, next) {
  // Criar uma cópia dos headers para não expor informações sensíveis
  const safeHeaders = { ...req.headers };
  
  // Remover informações sensíveis
  if (safeHeaders.authorization) {
    safeHeaders.authorization = safeHeaders.authorization.substring(0, 15) + '...';
  }
  
  if (safeHeaders.cookie) {
    safeHeaders.cookie = '[REDACTED]';
  }
  
  console.log(`[DEBUG-REQUEST] ${req.method} ${req.originalUrl}`);
  console.log('[DEBUG-REQUEST] Headers:', safeHeaders);
  console.log('[DEBUG-REQUEST] Query:', req.query);
  
  // Interceptar a resposta para logar o status
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`[DEBUG-REQUEST] Response status: ${res.statusCode}`);
    
    // Se for erro, logar mais detalhes
    if (res.statusCode >= 400) {
      try {
        const bodyObj = typeof body === 'string' ? JSON.parse(body) : body;
        console.log('[DEBUG-REQUEST] Error response:', bodyObj);
      } catch {
        console.log('[DEBUG-REQUEST] Error response (não JSON):', body);
      }
    }
    
    originalSend.apply(res, arguments);
  };
  
  next();
}