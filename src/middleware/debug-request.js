export function debugRequest(req, res, next) {
  // Usar console.log diretamente para evitar problemas de inicialização do logger
  if (process.env.NODE_ENV !== 'test') {
    process.stdout.write(`[DEBUG] ${req.method} ${req.url} - IP: ${req.ip || req.socket.remoteAddress}\n`);
  }
  next();
}

// Re-export para compatibilidade com imports existentes
export const debugRequestMiddleware = debugRequest;