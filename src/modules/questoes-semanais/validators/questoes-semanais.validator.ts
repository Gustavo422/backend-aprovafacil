import { z } from 'zod';

/**
 * Schemas de validação para questões semanais
 */

// Validação de path parameters
export const numeroSemanaPathSchema = z.object({
  numero_semana: z.string()
    .regex(/^\d+$/, 'numero_semana deve ser um número inteiro')
    .refine((val) => parseInt(val, 10) > 0, 'numero_semana deve ser maior que 0')
    .refine((val) => parseInt(val, 10) <= 52, 'numero_semana deve ser menor ou igual a 52'),
});

// Validação de query parameters para histórico
export const historicoQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string()
    .regex(/^\d+$/, 'limit deve ser um número')
    .refine((val) => parseInt(val, 10) >= 1, 'limit deve ser maior ou igual a 1')
    .refine((val) => parseInt(val, 10) <= 100, 'limit deve ser menor ou igual a 100')
    .default('10'),
});

// Validação de body para conclusão de semana
export const concluirSemanaBodySchema = z.object({
  respostas: z.array(z.object({
    questao_id: z.string().uuid('questao_id deve ser um UUID válido'),
    alternativa: z.string().min(1, 'alternativa não pode estar vazia'),
    correct: z.boolean().optional(),
    tempo_resposta_segundos: z.number().positive().optional(),
  })).optional().default([]),
  pontuacao: z.number()
    .min(0, 'pontuacao deve ser maior ou igual a 0')
    .max(100, 'pontuacao deve ser menor ou igual a 100')
    .optional()
    .default(0),
  tempo_minutos: z.number()
    .positive('tempo_minutos deve ser positivo')
    .max(1440, 'tempo_minutos não pode exceder 24 horas')
    .optional(),
  observacoes: z.string().max(500, 'observacoes não pode exceder 500 caracteres').optional(),
});

// Validação de query para roadmap
export const roadmapQuerySchema = z.object({
  include_stats: z.string()
    .transform((val) => val === 'true')
    .optional()
    .default('false'),
  ano: z.string()
    .regex(/^\d{4}$/, 'ano deve ser um ano válido (YYYY)')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 2020 && val <= 2030, 'ano deve estar entre 2020 e 2030')
    .optional(),
});

// Validação de query para semana atual
export const semanaAtualQuerySchema = z.object({
  include_roadmap: z.string()
    .transform((val) => val === 'true')
    .optional()
    .default('true'),
  include_historico: z.string()
    .transform((val) => val === 'true')
    .optional()
    .default('true'),
  historico_limit: z.string()
    .regex(/^\d+$/, 'historico_limit deve ser um número')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1, 'historico_limit deve ser maior ou igual a 1')
    .refine((val) => val <= 20, 'historico_limit deve ser menor ou igual a 20')
    .optional()
    .default('10'),
});

// Schemas de resposta padronizados
export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  pagination: z.object({
    page: z.number().positive(),
    limit: z.number().positive(),
    total: z.number().nonnegative(),
    totalPages: z.number().nonnegative(),
    nextCursor: z.string().optional(),
  }).optional(),
  metadata: z.object({
    timestamp: z.string().datetime(),
    duration: z.number().positive(),
    correlationId: z.string().optional(),
  }).optional(),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string().min(1, 'Mensagem de erro é obrigatória'),
  code: z.string().min(1, 'Código de erro é obrigatório'),
  details: z.unknown().optional(),
  metadata: z.object({
    timestamp: z.string().datetime(),
    correlationId: z.string().optional(),
    requestId: z.string().optional(),
  }).optional(),
});

// Schema de resposta unificado
export const apiResponseSchema = z.union([
  successResponseSchema,
  errorResponseSchema,
]);

// Códigos de erro semânticos
export const ErrorCodes = {
  // Validação
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Autenticação e Autorização
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // Recursos
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  WEEK_NOT_FOUND: 'WEEK_NOT_FOUND',
  CONCURSO_NOT_FOUND: 'CONCURSO_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  
  // Estado
  INVALID_WEEK_ORDER: 'INVALID_WEEK_ORDER',
  WEEK_ALREADY_COMPLETED: 'WEEK_ALREADY_COMPLETED',
  WEEK_NOT_AVAILABLE: 'WEEK_NOT_AVAILABLE',
  
  // Concorrência
  CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Sistema
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // Configuração
  CONCURSO_REQUIRED: 'CONCURSO_REQUIRED',
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Mapeamento de códigos para códigos HTTP
export const ErrorCodeToHttpStatus: Record<ErrorCode, number> = {
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 400,
  
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.INVALID_TOKEN]: 401,
  
  [ErrorCodes.RESOURCE_NOT_FOUND]: 404,
  [ErrorCodes.WEEK_NOT_FOUND]: 404,
  [ErrorCodes.CONCURSO_NOT_FOUND]: 404,
  [ErrorCodes.USER_NOT_FOUND]: 404,
  
  [ErrorCodes.INVALID_WEEK_ORDER]: 400,
  [ErrorCodes.WEEK_ALREADY_COMPLETED]: 409,
  [ErrorCodes.WEEK_NOT_AVAILABLE]: 423,
  
  [ErrorCodes.CONCURRENT_MODIFICATION]: 409,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
  
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.DATABASE_ERROR]: 500,
  
  [ErrorCodes.CONCURSO_REQUIRED]: 422,
  [ErrorCodes.INVALID_CONFIGURATION]: 500,
};

// Função helper para criar respostas de erro padronizadas
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown,
  correlationId?: string,
  requestId?: string,
) {
  return {
    success: false as const,
    error: message,
    code,
    details,
    metadata: {
      timestamp: new Date().toISOString(),
      correlationId,
      requestId,
    },
  };
}

// Função helper para criar respostas de sucesso padronizadas
export function createSuccessResponse(
  data: unknown,
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    nextCursor?: string;
  },
  correlationId?: string,
  duration?: number,
) {
  return {
    success: true as const,
    data,
    pagination,
    metadata: {
      timestamp: new Date().toISOString(),
      duration: duration ?? 0,
      correlationId,
    },
  };
}

// Função para validar e normalizar input
export function validateAndNormalize<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  context?: string,
): { success: true; data: T } | { success: false; error: z.ZodError } {
  try {
    const result = schema.parse(input);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

// Função para extrair mensagens de erro de validação
export function extractValidationErrors(zodError: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  
  zodError.errors.forEach((error) => {
    const path = error.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(error.message);
  });
  
  return errors;
}
