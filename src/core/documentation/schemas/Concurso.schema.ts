import { OpenAPIV3 } from 'openapi-types';

export const ConcursoSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'concurso-123' },
    nome: { type: 'string', example: 'Concurso Exemplo' },
    description: { type: 'string', example: 'Descrição do concurso' },
    dataInicio: { type: 'string', format: 'date', example: '2024-01-01' },
    dataFim: { type: 'string', format: 'date', example: '2024-12-31' },
    ativo: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' }
  }
};

export const ConcursoInputSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  required: ['nome'],
  properties: {
    nome: { type: 'string', minLength: 1, maxLength: 255, example: 'Concurso Exemplo' },
    description: { type: 'string', maxLength: 1000, example: 'Descrição do concurso' },
    dataInicio: { type: 'string', format: 'date', example: '2024-01-01' },
    dataFim: { type: 'string', format: 'date', example: '2024-12-31' },
    ativo: { type: 'boolean', example: true }
  }
}; 