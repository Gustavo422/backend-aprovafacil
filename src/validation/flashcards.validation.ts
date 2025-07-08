import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

// Schemas de validação
export const FlashcardSchema = z.object({
  pergunta: z.string().min(1, 'Pergunta é obrigatória').max(1000, 'Pergunta muito longa'),
  resposta: z.string().min(1, 'Resposta é obrigatória').max(2000, 'Resposta muito longa'),
  categoria_disciplina_id: z.string().uuid('ID da categoria deve ser um UUID válido'),
  concurso_id: z.string().uuid('ID do concurso deve ser um UUID válido'),
  nivel_dificuldade: z.enum(['facil', 'medio', 'dificil']).default('medio'),
  is_active: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional()
});

export const UpdateFlashcardSchema = FlashcardSchema.partial().extend({
  id: z.string().uuid('ID deve ser um UUID válido')
});

export const FlashcardFiltersSchema = z.object({
  categoria_disciplina_id: z.string().uuid('ID da categoria deve ser um UUID válido').optional(),
  concurso_id: z.string().uuid('ID do concurso deve ser um UUID válido').optional(),
  nivel_dificuldade: z.enum(['facil', 'medio', 'dificil']).optional(),
  is_active: z.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  orderBy: z.enum(['pergunta', 'created_at', 'updated_at']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc')
});

export const FlashcardIdSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido')
});

export const UserFlashcardProgressSchema = z.object({
  flashcard_id: z.string().uuid('ID do flashcard deve ser um UUID válido'),
  user_id: z.string().uuid('ID do usuário deve ser um UUID válido'),
  status: z.enum(['nao_visto', 'visto', 'revisado', 'dominado']).default('nao_visto'),
  tentativas: z.number().int().min(0).default(0),
  acertos: z.number().int().min(0).default(0),
  ultima_revisao: z.date().optional(),
  proxima_revisao: z.date().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const UpdateUserFlashcardProgressSchema = UserFlashcardProgressSchema.partial().extend({
  id: z.string().uuid('ID deve ser um UUID válido')
});

export const UserFlashcardProgressIdSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido')
});

// Middleware de validação genérico
const createValidationMiddleware = <T extends z.ZodTypeAny>(
  schema: T,
  field: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = field === 'body' ? req.body : field === 'query' ? req.query : req.params;
      
      const result = schema.safeParse(data);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        logger.warn('Validação falhou', undefined, {
          errors,
          url: req.originalUrl,
          method: req.method,
          ip: req.ip
        });
        
        res.status(400).json({
          error: 'Dados inválidos',
          details: errors,
          code: 'VALIDATION_ERROR'
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
      logger.error('Erro na validação', undefined, {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        url: req.originalUrl,
        method: req.method
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'VALIDATION_ERROR'
      });
    }
  };
};

// Middlewares de validação específicos
export const validateCreateFlashcard = createValidationMiddleware(FlashcardSchema, 'body');
export const validateUpdateFlashcard = createValidationMiddleware(UpdateFlashcardSchema, 'body');
export const validateFlashcardFilters = createValidationMiddleware(FlashcardFiltersSchema, 'query');
export const validateFlashcardId = createValidationMiddleware(FlashcardIdSchema, 'params');
export const validateCreateUserFlashcardProgress = createValidationMiddleware(UserFlashcardProgressSchema, 'body');
export const validateUpdateUserFlashcardProgress = createValidationMiddleware(UpdateUserFlashcardProgressSchema, 'body');
export const validateUserFlashcardProgressId = createValidationMiddleware(UserFlashcardProgressIdSchema, 'params');

// Função de validação manual para uso em serviços
export const validateFlashcardData = (data: unknown) => {
  return FlashcardSchema.safeParse(data);
};

export const validateFlashcardUpdateData = (data: unknown) => {
  return UpdateFlashcardSchema.safeParse(data);
};

export const validateFlashcardFiltersData = (data: unknown) => {
  return FlashcardFiltersSchema.safeParse(data);
};

export const validateUserFlashcardProgressData = (data: unknown) => {
  return UserFlashcardProgressSchema.safeParse(data);
};

export const validateUserFlashcardProgressUpdateData = (data: unknown) => {
  return UpdateUserFlashcardProgressSchema.safeParse(data);
};

// Exportar objeto default para compatibilidade
export default {
  validateCreateFlashcard,
  validateUpdateFlashcard,
  validateFlashcardFilters,
  validateFlashcardId,
  validateCreateUserFlashcardProgress,
  validateUpdateUserFlashcardProgress,
  validateUserFlashcardProgressId,
  validateFlashcardData,
  validateFlashcardUpdateData,
  validateFlashcardFiltersData,
  validateUserFlashcardProgressData,
  validateUserFlashcardProgressUpdateData,
  FlashcardSchema,
  UpdateFlashcardSchema,
  FlashcardFiltersSchema,
  FlashcardIdSchema,
  UserFlashcardProgressSchema,
  UpdateUserFlashcardProgressSchema,
  UserFlashcardProgressIdSchema
}; 