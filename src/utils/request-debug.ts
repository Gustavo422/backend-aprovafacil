/**
 * Utilitário para debug de requisições HTTP
 * 
 * Este módulo fornece funções para registrar detalhes de requisições HTTP,
 * facilitando o debug de problemas relacionados à API.
 */

import { Request, Response, NextFunction } from 'express';
import { createDebugger } from './debugger.js';
import { performance } from 'perf_hooks';

// Criar debugger específico para requisições
const requestDebug = createDebugger('api:request');

/**
 * Middleware para debug de requisições HTTP
 * 
 * @param req - Objeto de requisição Express
 * @param res - Objeto de resposta Express
 * @param next - Função next do Express
 * 
 * @example
 * // Usar como middleware global
 * app.use(requestDebugMiddleware);
 * 
 * // Ou em uma rota específica
 * router.get('/users', requestDebugMiddleware, usersController.getAll);
 */
export function requestDebugMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = performance.now();
  const requestId = generateRequestId();
  
  // Adicionar ID da requisição para rastreamento
  req.requestId = requestId;
  
  // Registrar início da requisição
  requestDebug.info(`[${requestId}] ${req.method} ${req.originalUrl}`);
  
  // Registrar detalhes da requisição se debug estiver habilitado
  if (requestDebug.enabled) {
    const requestDetails = {
      headers: sanitizeHeaders(req.headers),
      query: req.query,
      params: req.params,
      body: sanitizeBody(req.body),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    requestDebug(`[${requestId}] Detalhes da requisição: %o`, requestDetails);
  }
  
  // Capturar a resposta
  const originalSend = res.send;
  res.send = function(body: unknown): Response {
    const duration = Math.round(performance.now() - startTime);
    const contentLength = body ? (typeof body === 'string' ? body.length : JSON.stringify(body).length) : 0;
    
    // Registrar detalhes da resposta
    requestDebug.info(
      `[${requestId}] Resposta ${res.statusCode} enviada em ${duration}ms (${contentLength} bytes)`
    );
    
    // Se for erro, registrar mais detalhes
    if (res.statusCode >= 400) {
      requestDebug.warn(`[${requestId}] Erro ${res.statusCode}: %o`, sanitizeBody(body));
    }
    
    // Chamar o método original
    return originalSend.call(this, body);
  };
  
  next();
}

/**
 * Gera um ID único para a requisição
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * Remove informações sensíveis dos headers
 */
function sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...headers };
  
  // Remover ou mascarar headers sensíveis
  const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];
  for (const header of sensitiveHeaders) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Remove informações sensíveis do corpo da requisição
 */
function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sanitized = { ...body };
  
  // Remover ou mascarar campos sensíveis
  const sensitiveFields = ['password', 'senha', 'token', 'secret', 'apiKey', 'api_key', 'credit_card', 'creditCard'];
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Registra detalhes de uma requisição HTTP
 * 
 * @param req - Objeto de requisição Express
 * @param message - Mensagem adicional (opcional)
 * 
 * @example
 * // Registrar detalhes de uma requisição
 * logRequest(req, 'Processando requisição de login');
 */
export function logRequest(req: Request, message?: string): void {
  const requestId = req.requestId || generateRequestId();
  
  requestDebug.info(
    `[${requestId}] ${message || ''} ${req.method} ${req.originalUrl}`
  );
  
  if (requestDebug.enabled) {
    requestDebug(`[${requestId}] Detalhes: %o`, {
      headers: sanitizeHeaders(req.headers),
      query: req.query,
      params: req.params,
      body: sanitizeBody(req.body)
    });
  }
}

// Estender a interface Request do Express
declare module 'express' {
  interface Request {
    requestId?: string;
  }
}