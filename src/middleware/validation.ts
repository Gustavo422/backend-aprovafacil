import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { logger } from '../utils/logger.js';

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      logger.warn('Validação falhou', undefined, {
        error: error instanceof Error ? error.message : 'Erro de validação',
        url: req.originalUrl,
        method: req.method,
        body: req.body
      });
      
      res.status(400).json({
        error: 'Dados inválidos',
        details: error instanceof Error ? error.message : 'Erro de validação'
      });
    }
  };
}; 