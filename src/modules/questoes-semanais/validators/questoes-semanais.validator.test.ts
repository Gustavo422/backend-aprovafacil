import { describe, it, expect } from 'vitest';
import { 
  numeroSemanaPathSchema,
  historicoQuerySchema,
  concluirSemanaBodySchema,
  roadmapQuerySchema,
  semanaAtualQuerySchema,
  createErrorResponse,
  createSuccessResponse,
  validateAndNormalize,
  extractValidationErrors,
  ErrorCodes,
  ErrorCodeToHttpStatus,
} from './questoes-semanais.validator.js';

describe('QuestoesSemanais Validator', () => {
  describe('numeroSemanaPathSchema', () => {
    it('deve validar número de semana válido', () => {
      const result = numeroSemanaPathSchema.safeParse({ numero_semana: '5' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.numero_semana).toBe(5);
      }
    });

    it('deve rejeitar número de semana inválido', () => {
      const result = numeroSemanaPathSchema.safeParse({ numero_semana: 'abc' });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar número de semana zero', () => {
      const result = numeroSemanaPathSchema.safeParse({ numero_semana: '0' });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar número de semana maior que 52', () => {
      const result = numeroSemanaPathSchema.safeParse({ numero_semana: '53' });
      expect(result.success).toBe(false);
    });
  });

  describe('historicoQuerySchema', () => {
    it('deve validar query sem parâmetros', () => {
      const result = historicoQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
        expect(result.data.cursor).toBeUndefined();
      }
    });

    it('deve validar query com cursor', () => {
      const result = historicoQuerySchema.safeParse({ cursor: 'cursor123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cursor).toBe('cursor123');
        expect(result.data.limit).toBe(10);
      }
    });

    it('deve validar query com limit personalizado', () => {
      const result = historicoQuerySchema.safeParse({ limit: '25' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
      }
    });

    it('deve rejeitar limit muito alto', () => {
      const result = historicoQuerySchema.safeParse({ limit: '101' });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar limit muito baixo', () => {
      const result = historicoQuerySchema.safeParse({ limit: '0' });
      expect(result.success).toBe(false);
    });
  });

  describe('concluirSemanaBodySchema', () => {
    it('deve validar body vazio', () => {
      const result = concluirSemanaBodySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.respostas).toEqual([]);
        expect(result.data.pontuacao).toBe(0);
      }
    });

    it('deve validar body com respostas', () => {
      const body = {
        respostas: [
          {
            questao_id: '123e4567-e89b-12d3-a456-426614174000',
            alternativa: 'A',
            correct: true,
            tempo_resposta_segundos: 30,
          },
        ],
        pontuacao: 85,
        tempo_minutos: 45,
        observacoes: 'Muito bom!',
      };

      const result = concluirSemanaBodySchema.safeParse(body);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar questao_id inválido', () => {
      const body = {
        respostas: [
          {
            questao_id: 'invalid-uuid',
            alternativa: 'A',
          },
        ],
      };

      const result = concluirSemanaBodySchema.safeParse(body);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar alternativa vazia', () => {
      const body = {
        respostas: [
          {
            questao_id: '123e4567-e89b-12d3-a456-426614174000',
            alternativa: '',
          },
        ],
      };

      const result = concluirSemanaBodySchema.safeParse(body);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar pontuação negativa', () => {
      const body = { pontuacao: -10 };
      const result = concluirSemanaBodySchema.safeParse(body);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar pontuação muito alta', () => {
      const body = { pontuacao: 150 };
      const result = concluirSemanaBodySchema.safeParse(body);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar tempo negativo', () => {
      const body = { tempo_minutos: -5 };
      const result = concluirSemanaBodySchema.safeParse(body);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar tempo muito alto', () => {
      const body = { tempo_minutos: 2000 };
      const result = concluirSemanaBodySchema.safeParse(body);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar observações muito longas', () => {
      const body = { observacoes: 'a'.repeat(501) };
      const result = concluirSemanaBodySchema.safeParse(body);
      expect(result.success).toBe(false);
    });
  });

  describe('roadmapQuerySchema', () => {
    it('deve validar query sem parâmetros', () => {
      const result = roadmapQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_stats).toBe(false);
        expect(result.data.ano).toBeUndefined();
      }
    });

    it('deve validar include_stats como true', () => {
      const result = roadmapQuerySchema.safeParse({ include_stats: 'true' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_stats).toBe(true);
      }
    });

    it('deve validar ano válido', () => {
      const result = roadmapQuerySchema.safeParse({ ano: '2024' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ano).toBe(2024);
      }
    });

    it('deve rejeitar ano inválido', () => {
      const result = roadmapQuerySchema.safeParse({ ano: '202' });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar ano muito antigo', () => {
      const result = roadmapQuerySchema.safeParse({ ano: '2019' });
      expect(result.success).toBe(false);
    });

    it('deve rejeitar ano muito futuro', () => {
      const result = roadmapQuerySchema.safeParse({ ano: '2031' });
      expect(result.success).toBe(false);
    });
  });

  describe('semanaAtualQuerySchema', () => {
    it('deve validar query sem parâmetros', () => {
      const result = semanaAtualQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_roadmap).toBe(true);
        expect(result.data.include_historico).toBe(true);
        expect(result.data.historico_limit).toBe(10);
      }
    });

    it('deve validar include_roadmap como false', () => {
      const result = semanaAtualQuerySchema.safeParse({ include_roadmap: 'false' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_roadmap).toBe(false);
      }
    });

    it('deve validar historico_limit personalizado', () => {
      const result = semanaAtualQuerySchema.safeParse({ historico_limit: '15' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.historico_limit).toBe(15);
      }
    });

    it('deve rejeitar historico_limit muito alto', () => {
      const result = semanaAtualQuerySchema.safeParse({ historico_limit: '25' });
      expect(result.success).toBe(false);
    });
  });

  describe('createErrorResponse', () => {
    it('deve criar resposta de erro válida', () => {
      const response = createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Dados inválidos',
        { field: 'test' },
        'corr-123',
        'req-456'
      );

      expect(response.success).toBe(false);
      expect(response.error).toBe('Dados inválidos');
      expect(response.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(response.details).toEqual({ field: 'test' });
      expect(response.metadata?.correlationId).toBe('corr-123');
      expect(response.metadata?.requestId).toBe('req-456');
      expect(response.metadata?.timestamp).toBeDefined();
    });
  });

  describe('createSuccessResponse', () => {
    it('deve criar resposta de sucesso válida', () => {
      const data = { message: 'Sucesso' };
      const response = createSuccessResponse(
        data,
        { page: 1, limit: 10, total: 100, totalPages: 10 },
        'corr-123',
        150
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.pagination).toEqual({ page: 1, limit: 10, total: 100, totalPages: 10 });
      expect(response.metadata?.correlationId).toBe('corr-123');
      expect(response.metadata?.duration).toBe(150);
      expect(response.metadata?.timestamp).toBeDefined();
    });

    it('deve criar resposta de sucesso sem paginação', () => {
      const data = { message: 'Sucesso' };
      const response = createSuccessResponse(data, undefined, 'corr-123', 100);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.pagination).toBeUndefined();
    });
  });

  describe('validateAndNormalize', () => {
    it('deve validar e normalizar dados válidos', () => {
      const schema = historicoQuerySchema;
      const input = { limit: '20' };

      const result = validateAndNormalize(schema, input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it('deve retornar erro para dados inválidos', () => {
      const schema = historicoQuerySchema;
      const input = { limit: 'invalid' };

      const result = validateAndNormalize(schema, input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });

  describe('extractValidationErrors', () => {
    it('deve extrair erros de validação', () => {
      const schema = historicoQuerySchema;
      const input = { limit: 'invalid' };

      const result = validateAndNormalize(schema, input);
      if (!result.success) {
        const errors = extractValidationErrors(result.error);
        expect(errors).toHaveProperty('limit');
        expect(Array.isArray(errors.limit)).toBe(true);
      }
    });
  });

  describe('ErrorCodeToHttpStatus', () => {
    it('deve mapear códigos de erro para status HTTP corretos', () => {
      expect(ErrorCodeToHttpStatus[ErrorCodes.VALIDATION_ERROR]).toBe(400);
      expect(ErrorCodeToHttpStatus[ErrorCodes.UNAUTHORIZED]).toBe(401);
      expect(ErrorCodeToHttpStatus[ErrorCodes.FORBIDDEN]).toBe(403);
      expect(ErrorCodeToHttpStatus[ErrorCodes.RESOURCE_NOT_FOUND]).toBe(404);
      expect(ErrorCodeToHttpStatus[ErrorCodes.WEEK_ALREADY_COMPLETED]).toBe(409);
      expect(ErrorCodeToHttpStatus[ErrorCodes.RATE_LIMIT_EXCEEDED]).toBe(429);
      expect(ErrorCodeToHttpStatus[ErrorCodes.INTERNAL_ERROR]).toBe(500);
      expect(ErrorCodeToHttpStatus[ErrorCodes.SERVICE_UNAVAILABLE]).toBe(503);
    });
  });
});
