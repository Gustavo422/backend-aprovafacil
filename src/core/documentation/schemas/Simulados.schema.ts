export const SimuladoListItem = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    titulo: { type: 'string' },
    slug: { type: 'string' },
    descricao: { type: ['string', 'null'] },
    concurso_id: { type: ['string', 'null'], format: 'uuid' },
    categoria_id: { type: ['string', 'null'], format: 'uuid' },
    numero_questoes: { type: 'integer' },
    tempo_minutos: { type: 'integer' },
    dificuldade: { type: 'string' },
    disciplinas: { type: ['object', 'array', 'null'] },
    publico: { type: 'boolean' },
    ativo: { type: 'boolean' },
    atualizado_em: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'titulo', 'slug', 'numero_questoes', 'tempo_minutos', 'dificuldade', 'publico', 'ativo', 'atualizado_em'],
} as const;

export const SimuladoDetail = {
  allOf: [
    { $ref: '#/components/schemas/SimuladoListItem' },
    {
      type: 'object',
      properties: {
        criado_por: { type: ['string', 'null'], format: 'uuid' },
        criado_em: { type: 'string', format: 'date-time' },
      },
      required: ['criado_em'],
    },
  ],
} as const;

export const SimuladoProgressInput = {
  type: 'object',
  properties: {
    respostas: { type: 'object', additionalProperties: true },
    pontuacao: { type: 'number', minimum: 0 },
    tempo_gasto_minutos: { type: 'number', minimum: 0 },
    is_concluido: { type: 'boolean' },
    concluido_em: { type: 'string', format: 'date-time' },
    // legacy
    answers: { type: 'object', additionalProperties: true, deprecated: true },
    score: { type: 'number', minimum: 0, deprecated: true },
    timeTaken: { type: 'number', minimum: 0, deprecated: true },
  },
} as const;


