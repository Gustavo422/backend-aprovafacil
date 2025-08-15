import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';
import { 
  createErrorResponse, 
  ErrorCodes, 
  extractValidationErrors,
  validateAndNormalize 
} from '../validators/questoes-semanais.validator.js';

/**
 * Middleware para validar request body usando schema Zod
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validation = validateAndNormalize(schema, req.body, 'body');
    
    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      const response = createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Dados de entrada inválidos',
        { fields: errors },
        req.get('x-correlation-id'),
        req.get('x-request-id')
      );
      
      res.status(400).json(response);
      return;
    }
    
    // Normalizar e substituir o body validado
    req.body = validation.data;
    next();
  };
}

/**
 * Middleware para validar query parameters usando schema Zod
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validation = validateAndNormalize(schema, req.query, 'query');
    
    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      const response = createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Parâmetros de consulta inválidos',
        { fields: errors },
        req.get('x-correlation-id'),
        req.get('x-request-id')
      );
      
      res.status(400).json(response);
      return;
    }
    
    // Normalizar e substituir a query validada
    req.query = validation.data as any;
    next();
  };
}

/**
 * Middleware para validar path parameters usando schema Zod
 */
export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validation = validateAndNormalize(schema, req.params, 'params');
    
    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      const response = createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Parâmetros de rota inválidos',
        { fields: errors },
        req.get('x-correlation-id'),
        req.get('x-request-id')
      );
      
      res.status(400).json(response);
      return;
    }
    
    // Normalizar e substituir os params validados
    req.params = validation.data as any;
    next();
  };
}

/**
 * Middleware para validar headers específicos
 */
export function validateHeaders(requiredHeaders: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missingHeaders: string[] = [];
    
    for (const header of requiredHeaders) {
      if (!req.get(header)) {
        missingHeaders.push(header);
      }
    }
    
    if (missingHeaders.length > 0) {
      const response = createErrorResponse(
        ErrorCodes.MISSING_REQUIRED_FIELD,
        `Headers obrigatórios ausentes: ${missingHeaders.join(', ')}`,
        { missingHeaders },
        req.get('x-correlation-id'),
        req.get('x-request-id')
      );
      
      res.status(400).json(response);
      return;
    }
    
    next();
  };
}

/**
 * Middleware para validar autenticação
 */
export function validateAuth(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any)?.user;
  
  if (!user?.id) {
    const response = createErrorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Usuário não autenticado',
      undefined,
      req.get('x-correlation-id'),
      req.get('x-request-id')
    );
    
    res.status(401).json(response);
    return;
  }
  
  next();
}

/**
 * Middleware para validar concurso
 */
export function validateConcurso(req: Request, res: Response, next: NextFunction): void {
  const concursoId = (req as any)?.concursoId;
  
  if (!concursoId) {
    const response = createErrorResponse(
      ErrorCodes.CONCURSO_REQUIRED,
      'Concurso não configurado',
      undefined,
      req.get('x-correlation-id'),
      req.get('x-request-id')
    );
    
    res.status(422).json(response);
    return;
  }
  
  next();
}

/**
 * Middleware para validar rate limiting básico
 */
export function createRateLimitMiddleware(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000, // 15 minutos
) {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();
    
    const userRequests = requests.get(key);
    
    if (!userRequests || now > userRequests.resetTime) {
      // Reset ou primeira requisição
      requests.set(key, { count: 1, resetTime: now + windowMs });
    } else if (userRequests.count >= maxRequests) {
      // Rate limit excedido
      const response = createErrorResponse(
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        'Limite de requisições excedido',
        { 
          limit: maxRequests, 
          windowMs,
          retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
        },
        req.get('x-correlation-id'),
        req.get('x-request-id')
      );
      
      res.status(429).json(response);
      return;
    } else {
      // Incrementar contador
      userRequests.count++;
    }
    
    next();
  };
}

/**
 * Middleware para validar e sanitizar input geral
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  // Sanitizar strings para prevenir XSS básico
  const sanitizeString = (str: string): string => {
    return str
      .replace(/[<>]/g, '') // Remover < e >
      .trim();
  };
  
  // Sanitizar body
  if (req.body && typeof req.body === 'object') {
    const sanitizeObject = (obj: any): any => {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
      
      return sanitized;
    };
    
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitizar query parameters
  if (req.query && typeof req.query === 'object') {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        (req.query as any)[key] = sanitizeString(value);
      }
    }
  }
  
  next();
}
