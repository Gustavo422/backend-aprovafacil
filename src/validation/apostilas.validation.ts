import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

// Schemas de validação
export const ApostilaSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório').max(255, 'Título muito longo'),
  descricao: z.string().optional(),
  categoria_disciplina_id: z.string().uuid('ID da categoria deve ser um UUID válido'),
  concurso_id: z.string().uuid('ID do concurso deve ser um UUID válido'),
  ativo: z.boolean().default(true),
  ordem: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateApostilaSchema = ApostilaSchema.partial().extend({
  id: z.string().uuid('ID deve ser um UUID válido'),
});

export const ApostilaFiltersSchema = z.object({
  categoria_disciplina_id: z.string().uuid('ID da categoria deve ser um UUID válido').optional(),
  concurso_id: z.string().uuid('ID do concurso deve ser um UUID válido').optional(),
  ativo: z.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  orderBy: z.enum(['titulo', 'criado_em', 'atualizado_em']).default('criado_em'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const ApostilaIdSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido'),
});

export const ApostilaContentSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório').max(255, 'Título muito longo'),
  conteudo: z.string().min(1, 'Conteúdo é obrigatório'),
  tipo: z.enum(['texto', 'html', 'markdown']).default('texto'),
  ordem: z.number().int().min(0).default(0),
  ativo: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateApostilaContentSchema = ApostilaContentSchema.partial().extend({
  id: z.string().uuid('ID deve ser um UUID válido'),
});

export const ApostilaContentIdSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido'),
});

// Middleware de validação genérico
const createValidationMiddleware = <T extends z.ZodTypeAny>(
  schema: T,
  field: 'body' | 'query' | 'params' = 'body',
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = field === 'body' ? req.body : field === 'query' ? req.query : req.params;
      
      const result = schema.safeParse(data);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        logger.warn('Validação falhou', {
          errors,
          url: req.originalUrl,
          method: req.method,
          ip: req.ip,
        });
        
        res.status(400).json({
          error: 'Dados inválidos',
          details: errors,
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      
      // Atualizar os dados validados
      if (field === 'body') {
        req.body = result.data;
      } else if (field === 'query') {
        req.query = result.data as Record<string, string | string[] | undefined>;
      } else {
        req.params = result.data as Record<string, string>;
      }
      
      next();
    } catch (error) {
      logger.error('Erro na validação', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        url: req.originalUrl,
        method: req.method,
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'VALIDATION_ERROR',
      });
    }
  };
};

// Middlewares de validação específicos
export const validateCreateApostila = createValidationMiddleware(ApostilaSchema, 'body');
export const validateUpdateApostila = createValidationMiddleware(UpdateApostilaSchema, 'body');
export const validateApostilaFilters = createValidationMiddleware(ApostilaFiltersSchema, 'query');
export const validateApostilaId = createValidationMiddleware(ApostilaIdSchema, 'params');
export const validateCreateApostilaContent = createValidationMiddleware(ApostilaContentSchema, 'body');
export const validateUpdateApostilaContent = createValidationMiddleware(UpdateApostilaContentSchema, 'body');
export const validateApostilaContentId = createValidationMiddleware(ApostilaContentIdSchema, 'params');

// Função de validação manual para uso em serviços
export const validateApostilaData = (data: unknown) => {
  return ApostilaSchema.safeParse(data);
};

export const validateApostilaUpdateData = (data: unknown) => {
  return UpdateApostilaSchema.safeParse(data);
};

export const validateApostilaFiltersData = (data: unknown) => {
  return ApostilaFiltersSchema.safeParse(data);
};

// Exportar objeto default para compatibilidade
export default {
  validateCreateApostila,
  validateUpdateApostila,
  validateApostilaFilters,
  validateApostilaId,
  validateCreateApostilaContent,
  validateUpdateApostilaContent,
  validateApostilaContentId,
  validateApostilaData,
  validateApostilaUpdateData,
  validateApostilaFiltersData,
  ApostilaSchema,
  UpdateApostilaSchema,
  ApostilaFiltersSchema,
  ApostilaIdSchema,
  ApostilaContentSchema,
  UpdateApostilaContentSchema,
  ApostilaContentIdSchema,
}; 



