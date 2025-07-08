import { z } from 'zod';
import { logger } from '../utils/logger.js';
// Schemas de validação
export const ConcursoSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
    descricao: z.string().optional(),
    is_active: z.boolean().default(true),
    ordem: z.number().int().min(0).optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).optional()
});
export const UpdateConcursoSchema = ConcursoSchema.partial().extend({
    id: z.string().uuid('ID deve ser um UUID válido')
});
export const ConcursoFiltersSchema = z.object({
    is_active: z.boolean().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    orderBy: z.enum(['nome', 'created_at', 'updated_at']).default('created_at'),
    order: z.enum(['asc', 'desc']).default('desc')
});
export const ConcursoIdSchema = z.object({
    id: z.string().uuid('ID deve ser um UUID válido')
});
// Middleware de validação genérico
const createValidationMiddleware = (schema, field = 'body') => {
    return (req, res, next) => {
        try {
            const data = field === 'body' ? req.body : field === 'query' ? req.query : req.params;
            const result = schema.safeParse(data);
            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                logger.warn('Validação falhou', {
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
            }
            else if (field === 'query') {
                req.query = result.data;
            }
            else {
                req.params = result.data;
            }
            next();
        }
        catch (error) {
            logger.error('Erro na validação', {
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
export const validateCreateConcurso = createValidationMiddleware(ConcursoSchema, 'body');
export const validateUpdateConcurso = createValidationMiddleware(UpdateConcursoSchema, 'body');
export const validateConcursoFilters = createValidationMiddleware(ConcursoFiltersSchema, 'query');
export const validateConcursoId = createValidationMiddleware(ConcursoIdSchema, 'params');
// Função de validação manual para uso em serviços
export const validateConcursoData = (data) => {
    return ConcursoSchema.safeParse(data);
};
export const validateConcursoUpdateData = (data) => {
    return UpdateConcursoSchema.safeParse(data);
};
export const validateConcursoFiltersData = (data) => {
    return ConcursoFiltersSchema.safeParse(data);
};
// Exportar objeto default para compatibilidade
export default {
    validateCreateConcurso,
    validateUpdateConcurso,
    validateConcursoFilters,
    validateConcursoId,
    validateConcursoData,
    validateConcursoUpdateData,
    validateConcursoFiltersData,
    ConcursoSchema,
    UpdateConcursoSchema,
    ConcursoFiltersSchema,
    ConcursoIdSchema
};
//# sourceMappingURL=concursos.validation.js.map