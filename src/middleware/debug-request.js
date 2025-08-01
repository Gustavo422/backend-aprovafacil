import { getLogger } from '../lib/logging/logging-service.js';

const logger = getLogger('debug-request');

export function debugRequest(req, res, next) {
  // Usar console.log diretamente para evitar problemas de inicialização do logger
  console.log(`[DEBUG] ${req.method} ${req.url} - IP: ${req.ip || req.socket.remoteAddress}`);
  next();
}

// Re-export para compatibilidade com imports existentes
export const debugRequestMiddleware = debugRequest;