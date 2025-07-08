import { logger } from '../utils/logger.js';
export const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        }
        catch (error) {
            logger.warn('Validação falhou', {
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
//# sourceMappingURL=validation.js.map