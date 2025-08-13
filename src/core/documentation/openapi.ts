// Import ESM direto para compatibilidade com "type: module" e export estático
import { ErrorSchema } from './schemas/Error.schema.js';
import { SimuladoListItem, SimuladoDetail, SimuladoProgressInput } from './schemas/Simulados.schema.js';
import { ConcursoSchema, ConcursoInputSchema } from './schemas/Concurso.schema.js';
import { UserSchema } from './schemas/User.schema.js';

export const openApiConfig = {
  openapi: '3.0.0',
  info: {
    title: 'AprovaFácil API',
    description: 'API para sistema de estudos e preparação para concursos',
    version: '1.1.0',
    contact: {
      name: 'AprovaFacil Team',
      email: 'contato@aprovafacil.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Servidor de desenvolvimento',
    },
    {
      url: 'https://api.aprovafacil.com',
      description: 'Servidor de produção',
    },
  ],
  paths: {
    '/v1/simulados': {
      get: {
        operationId: 'listarSimuladosV1',
        tags: ['Simulados'],
        parameters: [
          { name: 'page', in: 'query', description: 'Número da página (>= 1)', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', description: 'Itens por página (1..100)', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
          { name: 'dificuldade', in: 'query', description: 'Filtro por dificuldade', schema: { type: 'string' } },
          { name: 'concurso_id', in: 'query', description: 'Filtrar por concurso (uuid)', schema: { type: 'string', format: 'uuid' } },
          { name: 'search', in: 'query', description: 'Busca por título/descrição', schema: { type: 'string' } },
          { name: 'publico', in: 'query', description: 'Apenas simulados públicos (true/false)', schema: { type: 'boolean' } },
          { name: 'status', in: 'query', description: 'Status do usuário no simulado', schema: { type: 'string', enum: ['finalizado', 'em_andamento', 'nao_iniciado'] } },
        ],
        responses: {
          200: {
            description: 'Lista de simulados',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        items: { type: 'array', items: SimuladoListItem },
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
            headers: {
              ETag: { description: 'ETag do recurso (lista)', schema: { type: 'string' } },
              'Last-Modified': { description: 'Timestamp da última modificação', schema: { type: 'string', format: 'date-time' } },
              'X-Request-Id': { description: 'ID de correlação/requisição', schema: { type: 'string' } },
              'X-Server-Duration': { description: 'Duração do processamento no servidor (ms)', schema: { type: 'number' } },
            },
          },
        },
      },
    },
    '/v1/simulados/{slug}': {
      get: {
        operationId: 'obterSimuladoPorSlugV1',
        tags: ['Simulados'],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Detalhe do simulado',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: SimuladoDetail } } } },
            headers: {
              ETag: { description: 'ETag do recurso (detalhe/meta)', schema: { type: 'string' } },
              'Last-Modified': { description: 'Timestamp da última modificação', schema: { type: 'string', format: 'date-time' } },
              'X-Request-Id': { description: 'ID de correlação/requisição', schema: { type: 'string' } },
              'X-Server-Duration': { description: 'Duração do processamento no servidor (ms)', schema: { type: 'number' } },
            },
          },
          404: { description: 'Não encontrado' },
        },
      },
    },
    '/v1/simulados/{slug}/questoes': {
      get: {
        operationId: 'listarQuestoesPorSlugV1',
        tags: ['Simulados'],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Questões do simulado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { type: 'object', additionalProperties: true } },
                  },
                },
              },
            },
            headers: {
              ETag: { description: 'ETag da seção de questões', schema: { type: 'string' } },
              'Last-Modified': { description: 'Timestamp da última modificação das questões', schema: { type: 'string', format: 'date-time' } },
              'X-Request-Id': { description: 'ID de correlação/requisição', schema: { type: 'string' } },
              'X-Server-Duration': { description: 'Duração do processamento no servidor (ms)', schema: { type: 'number' } },
            },
          },
        },
      },
    },
    '/v1/simulados/{slug}/progresso': {
      get: {
        operationId: 'obterProgressoUsuarioV1',
        tags: ['Simulados'],
        parameters: [ { name: 'slug', in: 'path', required: true, schema: { type: 'string' } } ],
        responses: {
          200: {
            description: 'Progresso do usuário',
            headers: {
              'X-Request-Id': { description: 'ID de correlação/requisição', schema: { type: 'string' } },
              'X-Server-Duration': { description: 'Duração do processamento no servidor (ms)', schema: { type: 'number' } },
            },
          },
        },
      },
      post: {
        operationId: 'criarProgressoUsuarioV1',
        tags: ['Simulados'],
        parameters: [ { name: 'slug', in: 'path', required: true, schema: { type: 'string' } } ],
        requestBody: { required: true, content: { 'application/json': { schema: SimuladoProgressInput } } },
        responses: {
          201: {
            description: 'Progresso criado',
            headers: {
              'X-Request-Id': { description: 'ID de correlação/requisição', schema: { type: 'string' } },
              'X-Server-Duration': { description: 'Duração do processamento no servidor (ms)', schema: { type: 'number' } },
            },
          },
        },
      },
      put: {
        operationId: 'atualizarProgressoUsuarioV1',
        tags: ['Simulados'],
        parameters: [ { name: 'slug', in: 'path', required: true, schema: { type: 'string' } } ],
        requestBody: { required: true, content: { 'application/json': { schema: SimuladoProgressInput } } },
        responses: {
          200: {
            description: 'Progresso atualizado',
            headers: {
              'X-Request-Id': { description: 'ID de correlação/requisição', schema: { type: 'string' } },
              'X-Server-Duration': { description: 'Duração do processamento no servidor (ms)', schema: { type: 'number' } },
            },
          },
        },
      },
    },
    // Guru v1 - aliases versionados mantendo compatibilidade
    '/guru/v1/dashboard/enhanced-stats': {
      get: {
        operationId: 'getGuruEnhancedStatsV1',
        summary: 'Guru v1 - Estatísticas aprimoradas do dashboard',
        description: 'Retorna dados agregados do dashboard do usuário (alias versionado).',
        tags: ['Guru'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/CorrelationId' },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/GuruEnhancedStats' },
                  },
                },
              },
            },
            headers: {
              'x-correlation-id': {
                description: 'ID de correlação para rastreamento ponta a ponta',
                schema: { type: 'string' },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
            headers: {
              'x-correlation-id': { description: 'ID de correlação', schema: { type: 'string' } },
            },
          },
          '429': {
            description: 'Rate limit excedido',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
            headers: {
              'x-correlation-id': { description: 'ID de correlação', schema: { type: 'string' } },
              'retry-after': { description: 'Sugestão de tempo (segundos) para tentar novamente', schema: { type: 'integer' } },
            },
          },
        },
      },
    },
    '/guru/v1/dashboard/activities': {
      get: {
        operationId: 'getGuruActivitiesV1',
        summary: 'Guru v1 - Atividades recentes',
        description: 'Lista atividades recentes do usuário no período, ordenadas por data.',
        tags: ['Guru'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Quantidade máxima de atividades',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
          },
          { $ref: '#/components/parameters/CorrelationId' },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/GuruActivity' },
                    },
                  },
                },
              },
            },
            headers: {
              'x-correlation-id': {
                description: 'ID de correlação para rastreamento ponta a ponta',
                schema: { type: 'string' },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
            headers: {
              'x-correlation-id': { description: 'ID de correlação', schema: { type: 'string' } },
            },
          },
          '429': {
            description: 'Rate limit excedido',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
            headers: {
              'x-correlation-id': { description: 'ID de correlação', schema: { type: 'string' } },
              'retry-after': { description: 'Sugestão de tempo (segundos) para tentar novamente', schema: { type: 'integer' } },
            },
          },
        },
      },
    },
    // Sub-rotas auxiliares do módulo Guru
    '/guru/v1/activities/simulados': {
      get: {
        operationId: 'getGuruActivitiesSimuladosV1',
        summary: 'Guru v1 - Atividades de simulados',
        description: 'Lista as atividades recentes relacionadas a simulados.',
        tags: ['Guru'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', description: 'Quantidade máxima de atividades', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
          { $ref: '#/components/parameters/CorrelationId' },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/GuruActivity' } },
                  },
                },
              },
            },
            headers: {
              'x-correlation-id': { description: 'ID de correlação', schema: { type: 'string' } },
            },
          },
          '401': { description: 'Não autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '429': { description: 'Rate limit excedido', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/guru/v1/activities/flashcards': {
      get: {
        operationId: 'getGuruActivitiesFlashcardsV1',
        summary: 'Guru v1 - Atividades de flashcards',
        description: 'Lista as atividades recentes relacionadas a flashcards.',
        tags: ['Guru'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', description: 'Quantidade máxima de atividades', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
          { $ref: '#/components/parameters/CorrelationId' },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/GuruActivity' } },
                  },
                },
              },
            },
            headers: {
              'x-correlation-id': { description: 'ID de correlação', schema: { type: 'string' } },
            },
          },
          '401': { description: 'Não autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '429': { description: 'Rate limit excedido', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/guru/v1/activities/apostilas': {
      get: {
        operationId: 'getGuruActivitiesApostilasV1',
        summary: 'Guru v1 - Atividades de apostilas/conteúdos',
        description: 'Lista as atividades recentes relacionadas a apostilas e outros conteúdos.',
        tags: ['Guru'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', description: 'Quantidade máxima de atividades', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
          { $ref: '#/components/parameters/CorrelationId' },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/GuruActivity' } },
                  },
                },
              },
            },
            headers: {
              'x-correlation-id': { description: 'ID de correlação', schema: { type: 'string' } },
            },
          },
          '401': { description: 'Não autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '429': { description: 'Rate limit excedido', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    // Caminhos legados mantidos como deprecated
    '/dashboard/enhanced-stats': {
      get: {
        operationId: 'getLegacyEnhancedStats',
        deprecated: true,
        summary: 'LEGACY - Estatísticas aprimoradas do dashboard',
        description: 'Alias legado; utilize /guru/v1/dashboard/enhanced-stats',
        tags: ['Dashboard'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/GuruEnhancedStats' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/dashboard/activities': {
      get: {
        operationId: 'getLegacyActivities',
        deprecated: true,
        summary: 'LEGACY - Atividades recentes',
        description: 'Alias legado; utilize /guru/v1/dashboard/activities',
        tags: ['Dashboard'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Quantidade máxima de atividades',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/GuruActivity' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        operationId: 'postAuthLogin',
        summary: 'Autenticar usuário',
        description: 'Realiza login do usuário com email e senha',
        tags: ['Autenticação'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'senha'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    description: 'Email do usuário',
                  },
                  senha: {
                    type: 'string',
                    minLength: 6,
                    description: 'Senha do usuário',
                  },
                },
              },
              examples: {
                login: {
                  summary: 'Exemplo de login',
                  value: {
                    email: 'usuario@exemplo.com',
                    senha: 'senha123',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login realizado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true,
                    },
                    user: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          example: 'user-123',
                        },
                        email: {
                          type: 'string',
                          example: 'usuario@exemplo.com',
                        },
                        nome: {
                          type: 'string',
                          example: 'João Silva',
                        },
                      },
                    },
                    message: {
                      type: 'string',
                      example: 'Login realizado com sucesso',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Dados inválidos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: false,
                    },
                    error: {
                      type: 'object',
                      properties: {
                        code: {
                          type: 'string',
                          example: 'VALIDATION_ERROR',
                        },
                        message: {
                          type: 'string',
                          example: 'Dados inválidos',
                        },
                        details: {
                          type: 'array',
                          items: {
                            type: 'object',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Credenciais inválidas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: false,
                    },
                    error: {
                      type: 'object',
                      properties: {
                        code: {
                          type: 'string',
                          example: 'INVALID_CREDENTIALS',
                        },
                        message: {
                          type: 'string',
                          example: 'Email ou senha incorretos',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        operationId: 'postAuthRegister',
        summary: 'Registrar novo usuário',
        description: 'Cria uma nova conta de usuário',
        tags: ['Autenticação'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'senha', 'nome', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    description: 'Email do usuário',
                  },
                  senha: {
                    type: 'string',
                    minLength: 6,
                    description: 'Senha do usuário',
                  },
                  password: {
                    type: 'string',
                    minLength: 6,
                    description: 'Senha do usuário (alias para senha)',
                  },
                  nome: {
                    type: 'string',
                    minLength: 2,
                    description: 'Nome completo do usuário',
                  },
                },
              },
              examples: {
                register: {
                  summary: 'Exemplo de registro',
                  value: {
                    email: 'novo@exemplo.com',
                    senha: 'senha123',
                    nome: 'Maria Silva',
                    password: 'senha123',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Usuário criado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true,
                    },
                    message: {
                      type: 'string',
                      example: 'Usuário criado com sucesso',
                    },
                    user: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          example: 'user-123',
                        },
                        email: {
                          type: 'string',
                          example: 'novo@exemplo.com',
                        },
                        nome: {
                          type: 'string',
                          example: 'Maria Silva',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        operationId: 'postAuthForgotPassword',
        summary: 'Solicitar redefinição de senha',
        description: 'Envia um email para redefinição de senha do usuário',
        tags: ['Autenticação'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    description: 'Email do usuário',
                  },
                },
              },
              examples: {
                forgot: {
                  summary: 'Exemplo de solicitação',
                  value: {
                    email: 'usuario@exemplo.com',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Email de redefinição enviado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Email enviado com sucesso' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Email inválido',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        operationId: 'postAuthResetPassword',
        summary: 'Redefinir senha',
        description: 'Permite redefinir a senha do usuário usando token enviado por email',
        tags: ['Autenticação'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'novaSenha'],
                properties: {
                  token: { type: 'string', description: 'Token de redefinição' },
                  novaSenha: { type: 'string', minLength: 6, description: 'Nova senha' },
                },
              },
              examples: {
                reset: {
                  summary: 'Exemplo de redefinição',
                  value: {
                    token: 'abcdef123456',
                    novaSenha: 'novasenha123',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Senha redefinida com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Senha redefinida com sucesso' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Token inválido ou senha fraca',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/auth/verify-reset-token': {
      post: {
        operationId: 'postAuthVerifyResetToken',
        summary: 'Verificar token de redefinição',
        description: 'Verifica se o token de redefinição de senha é válido',
        tags: ['Autenticação'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: {
                  token: { type: 'string', description: 'Token de redefinição' },
                },
              },
              examples: {
                verify: {
                  summary: 'Exemplo de verificação',
                  value: {
                    token: 'abcdef123456',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token válido',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Token válido' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Token inválido ou expirado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/apostilas': {
      get: {
        operationId: 'getApostilas',
        summary: 'Listar apostilas',
        description: 'Retorna lista de apostilas disponíveis com filtros opcionais',
        tags: ['Apostilas'],
        parameters: [
          {
            name: 'id',
            in: 'query',
            description: 'ID da apostila específica',
            schema: { type: 'string' },
          },
          {
            name: 'categoria',
            in: 'query',
            description: 'Filtrar por categoria',
            schema: { type: 'string' },
          },
          {
            name: 'concurso',
            in: 'query',
            description: 'Filtrar por concurso',
            schema: { type: 'string' },
          },
          {
            name: 'disciplina',
            in: 'query',
            description: 'Filtrar por disciplina',
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Número máximo de resultados',
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Número de resultados para pular',
            schema: { type: 'integer', default: 0, minimum: 0 },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de apostilas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    apostilas: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: 'apostila-123' },
                          titulo: { type: 'string', example: 'Direito Constitucional' },
                          categoria: { type: 'string', example: 'Direito' },
                          disciplina: { type: 'string', example: 'Constitucional' },
                          concurso: { type: 'string', example: 'OAB' },
                          description: { type: 'string', example: 'Apostila completa sobre Direito Constitucional' },
                          autor: { type: 'string', example: 'Prof. Silva' },
                          dataCriacao: { type: 'string', format: 'date-time' },
                          tamanho: { type: 'integer', example: 2048576 },
                          paginas: { type: 'integer', example: 150 },
                          avaliacao: { type: 'number', example: 4.5 },
                          downloads: { type: 'integer', example: 1250 },
                        },
                      },
                    },
                    paginacao: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 50 },
                        limit: { type: 'integer', example: 20 },
                        offset: { type: 'integer', example: 0 },
                        paginas: { type: 'integer', example: 3 },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Parâmetros inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        operationId: 'postApostilas',
        summary: 'Criar nova apostila',
        description: 'Cria uma nova apostila no sistema',
        tags: ['Apostilas'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['titulo'],
                properties: {
                  titulo: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 200,
                    description: 'Título da apostila',
                  },
                  categoria: {
                    type: 'string',
                    description: 'Categoria da apostila',
                  },
                  disciplina: {
                    type: 'string',
                    description: 'Disciplina da apostila',
                  },
                  concurso: {
                    type: 'string',
                    description: 'Concurso relacionado',
                  },
                  description: {
                    type: 'string',
                    maxLength: 1000,
                    description: 'Descrição da apostila',
                  },
                  autor: {
                    type: 'string',
                    description: 'Autor da apostila',
                  },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Tags para categorização',
                  },
                  visibilidade: {
                    type: 'string',
                    enum: ['publica', 'privada'],
                    default: 'publica',
                    description: 'Visibilidade da apostila',
                  },
                },
              },
              examples: {
                apostila: {
                  summary: 'Exemplo de criação de apostila',
                  value: {
                    titulo: 'Direito Administrativo',
                    categoria: 'Direito',
                    disciplina: 'Administrativo',
                    concurso: 'OAB',
                    description: 'Apostila completa sobre Direito Administrativo',
                    autor: 'Prof. Santos',
                    tags: ['direito', 'administrativo', 'oab'],
                    visibilidade: 'publica',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Apostila criada com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Apostila criada com sucesso' },
                    apostila: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: 'apostila-456' },
                        titulo: { type: 'string', example: 'Direito Administrativo' },
                        categoria: { type: 'string', example: 'Direito' },
                        dataCriacao: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Dados inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/apostilas/{id}': {
      get: {
        operationId: 'getApostilaById',
        summary: 'Buscar apostila por ID',
        description: 'Retorna detalhes completos de uma apostila específica',
        tags: ['Apostilas'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID da apostila',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Detalhes da apostila',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    apostila: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: 'apostila-123' },
                        titulo: { type: 'string', example: 'Direito Constitucional' },
                        categoria: { type: 'string', example: 'Direito' },
                        disciplina: { type: 'string', example: 'Constitucional' },
                        concurso: { type: 'string', example: 'OAB' },
                        description: { type: 'string', example: 'Apostila completa sobre Direito Constitucional' },
                        autor: { type: 'string', example: 'Prof. Silva' },
                        dataCriacao: { type: 'string', format: 'date-time' },
                        dataAtualizacao: { type: 'string', format: 'date-time' },
                        tamanho: { type: 'integer', example: 2048576 },
                        paginas: { type: 'integer', example: 150 },
                        avaliacao: { type: 'number', example: 4.5 },
                        downloads: { type: 'integer', example: 1250 },
                        tags: { type: 'array', items: { type: 'string' } },
                        visibilidade: { type: 'string', example: 'publica' },
                        conteudo: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              capitulo: { type: 'string', example: 'Capítulo 1' },
                              titulo: { type: 'string', example: 'Introdução' },
                              paginas: { type: 'integer', example: 15 },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Apostila não encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      put: {
        operationId: 'putApostilaById',
        summary: 'Atualizar apostila',
        description: 'Atualiza uma apostila existente',
        tags: ['Apostilas'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID da apostila',
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  titulo: { type: 'string', minLength: 3, maxLength: 200 },
                  categoria: { type: 'string' },
                  disciplina: { type: 'string' },
                  concurso: { type: 'string' },
                  description: { type: 'string', maxLength: 1000 },
                  autor: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  visibilidade: { type: 'string', enum: ['publica', 'privada'] },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Apostila atualizada com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Apostila atualizada com sucesso' },
                    apostila: { type: 'object' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Apostila não encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      delete: {
        operationId: 'deleteApostilaById',
        summary: 'Excluir apostila',
        description: 'Remove uma apostila do sistema',
        tags: ['Apostilas'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID da apostila',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Apostila excluída com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Apostila excluída com sucesso' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Apostila não encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/flashcards': {
      get: {
        operationId: 'getFlashcards',
        summary: 'Listar flashcards',
        description: 'Retorna lista de flashcards com filtros opcionais',
        tags: ['Flashcards'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'disciplina',
            in: 'query',
            description: 'Filtrar por disciplina',
            schema: { type: 'string' },
          },
          {
            name: 'tema',
            in: 'query',
            description: 'Filtrar por tema',
            schema: { type: 'string' },
          },
          {
            name: 'subtema',
            in: 'query',
            description: 'Filtrar por subtema',
            schema: { type: 'string' },
          },
          {
            name: 'concurso',
            in: 'query',
            description: 'Filtrar por concurso',
            schema: { type: 'string' },
          },
          {
            name: 'dificuldade',
            in: 'query',
            description: 'Filtrar por dificuldade',
            schema: { type: 'string', enum: ['facil', 'medio', 'dificil'] },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Número máximo de resultados',
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Número de resultados para pular',
            schema: { type: 'integer', default: 0, minimum: 0 },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de flashcards',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    flashcards: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: 'flashcard-123' },
                          front: { type: 'string', example: 'O que é Direito Constitucional?' },
                          back: { type: 'string', example: 'Ramo do direito que estuda a constituição' },
                          disciplina: { type: 'string', example: 'Direito' },
                          tema: { type: 'string', example: 'Constitucional' },
                          subtema: { type: 'string', example: 'Introdução' },
                          concurso: { type: 'string', example: 'OAB' },
                          dificuldade: { type: 'string', example: 'medio' },
                          dataCriacao: { type: 'string', format: 'date-time' },
                          dataAtualizacao: { type: 'string', format: 'date-time' },
                          acertos: { type: 'integer', example: 15 },
                          erros: { type: 'integer', example: 3 },
                          proximaRevisao: { type: 'string', format: 'date-time' },
                          nivel: { type: 'integer', example: 3 },
                        },
                      },
                    },
                    paginacao: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 150 },
                        limit: { type: 'integer', example: 20 },
                        offset: { type: 'integer', example: 0 },
                        paginas: { type: 'integer', example: 8 },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        operationId: 'postFlashcards',
        summary: 'Criar novo flashcard',
        description: 'Cria um novo flashcard no sistema',
        tags: ['Flashcards'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['front', 'back', 'disciplina', 'tema'],
                properties: {
                  front: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 500,
                    description: 'Frente do flashcard',
                  },
                  back: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 1000,
                    description: 'Verso do flashcard',
                  },
                  disciplina: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 100,
                    description: 'Disciplina do flashcard',
                  },
                  tema: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 100,
                    description: 'Tema do flashcard',
                  },
                  subtema: {
                    type: 'string',
                    maxLength: 100,
                    description: 'Subtema do flashcard',
                  },
                  concurso: {
                    type: 'string',
                    maxLength: 100,
                    description: 'Concurso relacionado',
                  },
                  dificuldade: {
                    type: 'string',
                    enum: ['facil', 'medio', 'dificil'],
                    default: 'medio',
                    description: 'Nível de dificuldade',
                  },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Tags para categorização',
                  },
                },
              },
              examples: {
                flashcard: {
                  summary: 'Exemplo de criação de flashcard',
                  value: {
                    front: 'Qual é a capital do Brasil?',
                    back: 'Brasília',
                    disciplina: 'Geografia',
                    tema: 'Capitais',
                    subtema: 'Brasil',
                    concurso: 'ENEM',
                    dificuldade: 'facil',
                    tags: ['geografia', 'capitais', 'brasil'],
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Flashcard criado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Flashcard criado com sucesso' },
                    flashcard: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: 'flashcard-456' },
                        front: { type: 'string', example: 'Qual é a capital do Brasil?' },
                        back: { type: 'string', example: 'Brasília' },
                        disciplina: { type: 'string', example: 'Geografia' },
                        tema: { type: 'string', example: 'Capitais' },
                        dataCriacao: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Dados inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/flashcards/progress': {
      get: {
        operationId: 'getFlashcardsProgress',
        summary: 'Obter progresso dos flashcards',
        description: 'Retorna estatísticas de progresso dos flashcards do usuário',
        tags: ['Flashcards'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'disciplina',
            in: 'query',
            description: 'Filtrar por disciplina',
            schema: { type: 'string' },
          },
          {
            name: 'periodo',
            in: 'query',
            description: 'Período para análise',
            schema: { type: 'string', enum: ['dia', 'semana', 'mes', 'ano'], default: 'semana' },
          },
        ],
        responses: {
          '200': {
            description: 'Progresso dos flashcards',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    progresso: {
                      type: 'object',
                      properties: {
                        totalFlashcards: { type: 'integer', example: 150 },
                        flashcardsEstudados: { type: 'integer', example: 120 },
                        acertos: { type: 'integer', example: 95 },
                        erros: { type: 'integer', example: 25 },
                        taxaAcerto: { type: 'number', example: 0.79 },
                        tempoEstudo: { type: 'integer', example: 3600 },
                        streak: { type: 'integer', example: 7 },
                        proximaRevisao: { type: 'integer', example: 15 },
                        porDisciplina: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              disciplina: { type: 'string', example: 'Direito' },
                              total: { type: 'integer', example: 50 },
                              estudados: { type: 'integer', example: 40 },
                              taxaAcerto: { type: 'number', example: 0.85 },
                            },
                          },
                        },
                        porDificuldade: {
                          type: 'object',
                          properties: {
                            facil: { type: 'integer', example: 30 },
                            medio: { type: 'integer', example: 60 },
                            dificil: { type: 'integer', example: 30 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        operationId: 'postFlashcardsProgress',
        summary: 'Registrar progresso do flashcard',
        description: 'Registra o resultado de uma revisão de flashcard',
        tags: ['Flashcards'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['flashcardId', 'acertou'],
                properties: {
                  flashcardId: {
                    type: 'string',
                    description: 'ID do flashcard',
                  },
                  acertou: {
                    type: 'boolean',
                    description: 'Se o usuário acertou ou não',
                  },
                  tempoResposta: {
                    type: 'integer',
                    description: 'Tempo de resposta em segundos',
                  },
                  dificuldade: {
                    type: 'string',
                    enum: ['facil', 'medio', 'dificil'],
                    description: 'Dificuldade percebida pelo usuário',
                  },
                },
              },
              examples: {
                progresso: {
                  summary: 'Exemplo de registro de progresso',
                  value: {
                    flashcardId: 'flashcard-123',
                    acertou: true,
                    tempoResposta: 5,
                    dificuldade: 'medio',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Progresso registrado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Progresso registrado com sucesso' },
                    proximaRevisao: { type: 'string', format: 'date-time' },
                    nivel: { type: 'integer', example: 4 },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Dados inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Flashcard não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/simulados': {
      get: {
        operationId: 'getSimulados',
        summary: 'Listar simulados',
        description: 'Retorna lista paginada de simulados do concurso ativo (campos em snake_case idênticos ao DB).',
        tags: ['Simulados'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', description: 'Página (1-based)', schema: { type: 'integer', default: 1, minimum: 1 } },
          { name: 'limit', in: 'query', description: 'Limite por página', schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 } },
          { name: 'dificuldade', in: 'query', description: 'Filtro opcional por dificuldade', schema: { type: 'string', enum: ['facil', 'medio', 'dificil'] } },
          { name: 'publico', in: 'query', description: 'Filtro opcional por visibilidade pública', schema: { type: 'boolean' } },
          { name: 'search', in: 'query', description: 'Busca textual (título/descrição)', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Lista de simulados',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: '6f9a6f52-1c5a-4c40-8e75-2f5c7f2b3d21' },
                          titulo: { type: 'string', example: 'Simulado OAB - Direito Constitucional' },
                          slug: { type: 'string', example: 'oab-direito-constitucional' },
                          descricao: { type: 'string', nullable: true },
                          concurso_id: { type: 'string', nullable: true },
                          categoria_id: { type: 'string', nullable: true },
                          numero_questoes: { type: 'integer', example: 50 },
                          tempo_minutos: { type: 'integer', example: 60 },
                          dificuldade: { type: 'string', example: 'medio' },
                          disciplinas: { type: 'object', nullable: true },
                          publico: { type: 'boolean', example: true },
                          ativo: { type: 'boolean', example: true },
                          criado_por: { type: 'string', nullable: true },
                          criado_em: { type: 'string', format: 'date-time' },
                          atualizado_em: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer', example: 1 },
                        limit: { type: 'integer', example: 10 },
                        total: { type: 'integer', example: 25 },
                        totalPages: { type: 'integer', example: 3 },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Concurso não configurado ou requisição inválida',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '401': {
            description: 'Não autorizado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
      post: {
        operationId: 'postSimulados',
        summary: 'Criar novo simulado',
        description: 'Cria um novo simulado (campos em snake_case). Durante o período de transição, campos legados são aceitos e mapeados.',
        tags: ['Simulados'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['titulo'],
                properties: {
                  titulo: { type: 'string', minLength: 1, maxLength: 255 },
                  descricao: { type: 'string' },
                  concurso_id: { type: 'string', format: 'uuid' },
                  categoria_id: { type: 'string', format: 'uuid' },
                  numero_questoes: { type: 'integer', minimum: 1 },
                  tempo_minutos: { type: 'integer', minimum: 1 },
                  dificuldade: { type: 'string', enum: ['facil', 'medio', 'dificil'] },
                  disciplinas: { type: 'object' },
                  publico: { type: 'boolean' },
                  ativo: { type: 'boolean' },
                  // legados aceitos (deprecated)
                  tempo_duracao_minutos: { type: 'integer', deprecated: true, description: 'Use tempo_minutos' },
                  total_questoes: { type: 'integer', deprecated: true, description: 'Use numero_questoes' },
                  is_public: { type: 'boolean', deprecated: true, description: 'Use publico' },
                },
              },
              examples: {
                snake_case: {
                  summary: 'Exemplo (preferencial) com snake_case',
                  value: { titulo: 'Simulado Polícia Civil', numero_questoes: 60, tempo_minutos: 90, dificuldade: 'medio', publico: true },
                },
                legado: {
                  summary: 'Exemplo legado (deprecated)',
                  value: { titulo: 'Simulado OAB', total_questoes: 50, tempo_duracao_minutos: 60, is_public: true },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Simulado criado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: '6f9a6f52-1c5a-4c40-8e75-2f5c7f2b3d21' },
                        titulo: { type: 'string' },
                        slug: { type: 'string' },
                        numero_questoes: { type: 'integer' },
                        tempo_minutos: { type: 'integer' },
                        publico: { type: 'boolean' },
                        criado_em: { type: 'string', format: 'date-time' },
                        atualizado_em: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Dados inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Não autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/simulados/slug/{slug}': {
      get: {
        operationId: 'getSimuladoBySlug',
        summary: 'Buscar simulado por slug',
        description: 'Retorna detalhes completos de um simulado por slug (preferencial).',
        tags: ['Simulados'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'slug', in: 'path', required: true, description: 'Slug do simulado', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Detalhes do simulado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        titulo: { type: 'string' },
                        slug: { type: 'string' },
                        descricao: { type: 'string', nullable: true },
                        concurso_id: { type: 'string', nullable: true },
                        categoria_id: { type: 'string', nullable: true },
                        numero_questoes: { type: 'integer' },
                        tempo_minutos: { type: 'integer' },
                        dificuldade: { type: 'string' },
                        disciplinas: { type: 'object', nullable: true },
                        publico: { type: 'boolean' },
                        ativo: { type: 'boolean' },
                        criado_por: { type: 'string', nullable: true },
                        criado_em: { type: 'string', format: 'date-time' },
                        atualizado_em: { type: 'string', format: 'date-time' },
                        questoes_simulado: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                              id: { type: 'string' },
                              numero_questao: { type: 'integer' },
                              enunciado: { type: 'string' },
                              alternativas: { type: 'object' },
                              resposta_correta: { type: 'string' },
                        explicacao: { type: 'string' },
                              disciplina: { type: 'string' },
                              assunto: { type: 'string' },
                              dificuldade: { type: 'string' },
                              ordem: { type: 'integer' },
                              peso_disciplina: { type: 'integer' },
                              criado_em: { type: 'string', format: 'date-time' },
                              atualizado_em: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
                  },
                },
              },
            },
          },
          '404': { description: 'Simulado não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/simulados/slug/{slug}/questoes': {
      get: {
        operationId: 'getQuestoesBySimuladoSlug',
        summary: 'Listar questões do simulado por slug',
        description: 'Retorna as questões de um simulado identificado por slug.',
        tags: ['Simulados'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'slug', in: 'path', required: true, description: 'Slug do simulado', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Lista de questões',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                      type: 'object',
                      properties: {
                          id: { type: 'string' },
                          simulado_id: { type: 'string' },
                          numero_questao: { type: 'integer' },
                          enunciado: { type: 'string' },
                          alternativas: { type: 'object' },
                          resposta_correta: { type: 'string' },
                          explicacao: { type: 'string' },
                          disciplina: { type: 'string' },
                          assunto: { type: 'string' },
                          dificuldade: { type: 'string' },
                          ordem: { type: 'integer' },
                          peso_disciplina: { type: 'integer' },
                          ativo: { type: 'boolean' },
                          criado_em: { type: 'string', format: 'date-time' },
                          atualizado_em: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          },
          '404': { description: 'Simulado não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/simulados/slug/{slug}/progresso': {
      get: {
        operationId: 'getProgressBySimuladoSlug',
        summary: 'Buscar progresso do usuário por slug',
        description: 'Retorna o progresso do usuário autenticado para um simulado identificado por slug.',
        tags: ['Simulados'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'slug', in: 'path', required: true, description: 'Slug do simulado', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Progresso do usuário',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          usuario_id: { type: 'string' },
                          simulado_id: { type: 'string' },
                          pontuacao: { type: 'number' },
                          tempo_gasto_minutos: { type: 'integer' },
                          respostas: { type: 'object' },
                          concluido_em: { type: 'string', format: 'date-time', nullable: true },
                          is_concluido: { type: 'boolean' },
                          criado_em: { type: 'string', format: 'date-time' },
                          atualizado_em: { type: 'string', format: 'date-time' },
              },
            },
          },
                  },
                },
              },
            },
          },
          '401': { description: 'Não autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Simulado não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/simulados/{id}': {
      get: {
        operationId: 'getSimuladoById',
        summary: 'Buscar simulado por ID',
        description: 'Retorna detalhes completos de um simulado específico (snake_case). Prefira usar o endpoint por slug.',
        deprecated: true,
        tags: ['Simulados'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID do simulado',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Detalhes do simulado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        titulo: { type: 'string' },
                        slug: { type: 'string' },
                        descricao: { type: 'string', nullable: true },
                        concurso_id: { type: 'string', nullable: true },
                        categoria_id: { type: 'string', nullable: true },
                        numero_questoes: { type: 'integer' },
                        tempo_minutos: { type: 'integer' },
                        dificuldade: { type: 'string' },
                        disciplinas: { type: 'object', nullable: true },
                        publico: { type: 'boolean' },
                        ativo: { type: 'boolean' },
                        criado_por: { type: 'string', nullable: true },
                        criado_em: { type: 'string', format: 'date-time' },
                        atualizado_em: { type: 'string', format: 'date-time' },
                        questoes_simulado: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              numero_questao: { type: 'integer' },
                              enunciado: { type: 'string' },
                              alternativas: { type: 'object' },
                              resposta_correta: { type: 'string' },
                              explicacao: { type: 'string' },
                              disciplina: { type: 'string' },
                              assunto: { type: 'string' },
                              dificuldade: { type: 'string' },
                              ordem: { type: 'integer' },
                              peso_disciplina: { type: 'integer' },
                              criado_em: { type: 'string', format: 'date-time' },
                              atualizado_em: { type: 'string', format: 'date-time' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Simulado não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/simulados/create': {
      post: {
        operationId: 'postSimuladosCreate',
        summary: 'Criar simulado personalizado',
        description: 'Cria um simulado personalizado com questões selecionadas',
        tags: ['Simulados'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['titulo', 'questoesIds'],
                properties: {
                  titulo: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 200,
                    description: 'Título do simulado',
                  },
                  description: {
                    type: 'string',
                    maxLength: 1000,
                    description: 'Descrição do simulado',
                  },
                  questoesIds: {
                    type: 'array',
                    minItems: 5,
                    maxItems: 200,
                    items: { type: 'string' },
                    description: 'IDs das questões selecionadas',
                  },
                  tempo_minutos: {
                    type: 'integer',
                    minimum: 1,
                    description: 'Tempo do simulado em minutos',
                  },
                },
              },
              examples: {
                personalizado: {
                  summary: 'Exemplo de simulado personalizado',
                  value: {
                    titulo: 'Meu Simulado Personalizado',
                    description: 'Simulado criado com questões selecionadas',
                    questoesIds: ['questao-1', 'questao-2', 'questao-3', 'questao-4', 'questao-5'],
                    tempo_minutos: 30,
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Simulado personalizado criado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Simulado personalizado criado com sucesso' },
                    simulado: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/estatisticas': {
      get: {
        operationId: 'getEstatisticas',
        summary: 'Obter estatísticas gerais',
        description: 'Retorna estatísticas gerais do usuário',
        tags: ['Estatísticas'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'periodo',
            in: 'query',
            description: 'Período para análise',
            schema: { type: 'string', enum: ['dia', 'semana', 'mes', 'ano'], default: 'mes' },
          },
          {
            name: 'concurso',
            in: 'query',
            description: 'Filtrar por concurso',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Estatísticas do usuário',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    estatisticas: {
                      type: 'object',
                      properties: {
                        tempoEstudo: { type: 'integer', example: 7200 },
                        questoesRespondidas: { type: 'integer', example: 150 },
                        acertos: { type: 'integer', example: 120 },
                        erros: { type: 'integer', example: 30 },
                        taxaAcerto: { type: 'number', example: 0.8 },
                        simuladosRealizados: { type: 'integer', example: 5 },
                        flashcardsEstudados: { type: 'integer', example: 200 },
                        apostilasLidas: { type: 'integer', example: 3 },
                        streak: { type: 'integer', example: 7 },
                        ranking: { type: 'integer', example: 15 },
                        porDisciplina: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              disciplina: { type: 'string', example: 'Direito' },
                              questoes: { type: 'integer', example: 50 },
                              acertos: { type: 'integer', example: 40 },
                              taxaAcerto: { type: 'number', example: 0.8 },
                            },
                          },
                        },
                        progresso: {
                          type: 'object',
                          properties: {
                            objetivo: { type: 'string', example: 'OAB' },
                            progresso: { type: 'number', example: 0.65 },
                            tempoRestante: { type: 'integer', example: 86400 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/plano-estudos': {
      get: {
        operationId: 'getPlanoEstudos',
        summary: 'Listar planos de estudo',
        description: 'Retorna lista de planos de estudo do usuário',
        tags: ['Plano de Estudos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            description: 'Filtrar por status',
            schema: { type: 'string', enum: ['ativo', 'pausado', 'concluido'] },
          },
          {
            name: 'concurso',
            in: 'query',
            description: 'Filtrar por concurso',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de planos de estudo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    planos: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: 'plano-123' },
                          titulo: { type: 'string', example: 'Plano OAB 2024' },
                          objetivo: { type: 'string', example: 'Aprovação na OAB' },
                          dataInicio: { type: 'string', format: 'date' },
                          dataFim: { type: 'string', format: 'date' },
                          status: { type: 'string', example: 'ativo' },
                          progresso: { type: 'number', example: 0.65 },
                          disciplinas: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                disciplina: { type: 'string', example: 'Direito Constitucional' },
                                tempoAlocado: { type: 'integer', example: 3600 },
                                progresso: { type: 'number', example: 0.8 },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        operationId: 'postPlanoEstudos',
        summary: 'Criar plano de estudo',
        description: 'Cria um novo plano de estudo personalizado',
        tags: ['Plano de Estudos'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['titulo', 'objetivo', 'dataInicio', 'dataFim', 'disciplinas'],
                properties: {
                  titulo: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 200,
                    description: 'Título do plano',
                  },
                  objetivo: {
                    type: 'string',
                    minLength: 10,
                    maxLength: 500,
                    description: 'Objetivo do plano',
                  },
                  dataInicio: {
                    type: 'string',
                    format: 'date',
                    description: 'Data de início',
                  },
                  dataFim: {
                    type: 'string',
                    format: 'date',
                    description: 'Data de término',
                  },
                  disciplinas: {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'object',
                      required: ['disciplina', 'tempoAlocado'],
                      properties: {
                        disciplina: { type: 'string', description: 'Nome da disciplina' },
                        tempoAlocado: { type: 'integer', minimum: 300, description: 'Tempo em segundos' },
                        prioridade: { type: 'string', enum: ['baixa', 'media', 'alta'], default: 'media' },
                      },
                    },
                  },
                  metaDiaria: {
                    type: 'integer',
                    minimum: 900,
                    maximum: 28800,
                    description: 'Meta de estudo diário em segundos',
                  },
                  diasEstudo: {
                    type: 'array',
                    items: { type: 'integer', minimum: 0, maximum: 6 },
                    description: 'Dias da semana para estudo (0=domingo, 6=sábado)',
                  },
                },
              },
              examples: {
                plano: {
                  summary: 'Exemplo de plano de estudo',
                  value: {
                    titulo: 'Plano OAB 2024',
                    objetivo: 'Aprovação na OAB com pontuação acima de 80%',
                    dataInicio: '2024-01-01',
                    dataFim: '2024-06-30',
                    disciplinas: [
                      {
                        disciplina: 'Direito Constitucional',
                        tempoAlocado: 3600,
                        prioridade: 'alta',
                      },
                      {
                        disciplina: 'Direito Administrativo',
                        tempoAlocado: 2700,
                        prioridade: 'media',
                      },
                    ],
                    metaDiaria: 7200,
                    diasEstudo: [1, 2, 3, 4, 5, 6],
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Plano de estudo criado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Plano de estudo criado com sucesso' },
                    plano: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: 'plano-456' },
                        titulo: { type: 'string', example: 'Plano OAB 2024' },
                        dataCriacao: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Dados inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/plano-estudos/{id}': {
      get: {
        operationId: 'getPlanoEstudosById',
        summary: 'Buscar plano de estudo por ID',
        description: 'Retorna detalhes completos de um plano de estudo',
        tags: ['Plano de Estudos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID do plano de estudo',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Detalhes do plano de estudo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    plano: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: 'plano-123' },
                        titulo: { type: 'string', example: 'Plano OAB 2024' },
                        objetivo: { type: 'string', example: 'Aprovação na OAB' },
                        dataInicio: { type: 'string', format: 'date' },
                        dataFim: { type: 'string', format: 'date' },
                        status: { type: 'string', example: 'ativo' },
                        progresso: { type: 'number', example: 0.65 },
                        metaDiaria: { type: 'integer', example: 7200 },
                        diasEstudo: { type: 'array', items: { type: 'integer' } },
                        disciplinas: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              disciplina: { type: 'string', example: 'Direito Constitucional' },
                              tempoAlocado: { type: 'integer', example: 3600 },
                              progresso: { type: 'number', example: 0.8 },
                              prioridade: { type: 'string', example: 'alta' },
                              tempoEstudado: { type: 'integer', example: 2880 },
                            },
                          },
                        },
                        atividades: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              data: { type: 'string', format: 'date' },
                              tempoEstudado: { type: 'integer', example: 7200 },
                              disciplinas: { type: 'array', items: { type: 'string' } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Plano de estudo não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      put: {
        operationId: 'putPlanoEstudosById',
        summary: 'Atualizar plano de estudo',
        description: 'Atualiza um plano de estudo existente',
        tags: ['Plano de Estudos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID do plano de estudo',
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  titulo: { type: 'string', minLength: 3, maxLength: 200 },
                  objetivo: { type: 'string', minLength: 10, maxLength: 500 },
                  dataFim: { type: 'string', format: 'date' },
                  status: { type: 'string', enum: ['ativo', 'pausado', 'concluido'] },
                  disciplinas: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        disciplina: { type: 'string' },
                        tempoAlocado: { type: 'integer', minimum: 300 },
                        prioridade: { type: 'string', enum: ['baixa', 'media', 'alta'] },
                      },
                    },
                  },
                  metaDiaria: { type: 'integer', minimum: 900, maximum: 28800 },
                  diasEstudo: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 6 } },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Plano de estudo atualizado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Plano de estudo atualizado com sucesso' },
                    plano: { type: 'object' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Plano de estudo não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      delete: {
        operationId: 'deletePlanoEstudosById',
        summary: 'Excluir plano de estudo',
        description: 'Remove um plano de estudo do sistema',
        tags: ['Plano de Estudos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID do plano de estudo',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Plano de estudo excluído com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Plano de estudo excluído com sucesso' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Plano de estudo não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/questoes-semanais': {
      get: {
        operationId: 'getQuestoesSemanais',
        summary: 'Listar questões semanais',
        description: 'Retorna lista de questões semanais disponíveis',
        tags: ['Questões Semanais'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'concurso',
            in: 'query',
            description: 'Filtrar por concurso',
            schema: { type: 'string' },
          },
          {
            name: 'disciplina',
            in: 'query',
            description: 'Filtrar por disciplina',
            schema: { type: 'string' },
          },
          {
            name: 'semana',
            in: 'query',
            description: 'Número da semana',
            schema: { type: 'integer', minimum: 1, maximum: 52 },
          },
          {
            name: 'ano',
            in: 'query',
            description: 'Ano de referência',
            schema: { type: 'integer', minimum: 2020 },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de questões semanais',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    questoes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: 'questao-semanal-123' },
                          titulo: { type: 'string', example: 'Questão Semanal #15' },
                          description: { type: 'string', example: 'Questão de Direito Constitucional' },
                          concurso: { type: 'string', example: 'OAB' },
                          disciplina: { type: 'string', example: 'Direito Constitucional' },
                          semana: { type: 'integer', example: 15 },
                          ano: { type: 'integer', example: 2024 },
                          dataPublicacao: { type: 'string', format: 'date' },
                          status: { type: 'string', example: 'disponivel' },
                          tentativas: { type: 'integer', example: 0 },
                          acertos: { type: 'integer', example: 0 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        operationId: 'postQuestoesSemanais',
        summary: 'Criar questão semanal',
        description: 'Cria uma nova questão semanal',
        tags: ['Questões Semanais'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['titulo', 'concurso', 'disciplina', 'enunciado', 'alternativas', 'respostaCorreta'],
                properties: {
                  titulo: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 200,
                    description: 'Título da questão',
                  },
                  description: {
                    type: 'string',
                    maxLength: 500,
                    description: 'Descrição da questão',
                  },
                  concurso: {
                    type: 'string',
                    description: 'Concurso relacionado',
                  },
                  disciplina: {
                    type: 'string',
                    description: 'Disciplina da questão',
                  },
                  semana: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 52,
                    description: 'Número da semana',
                  },
                  ano: {
                    type: 'integer',
                    minimum: 2020,
                    description: 'Ano de referência',
                  },
                  enunciado: {
                    type: 'string',
                    minLength: 10,
                    description: 'Enunciado da questão',
                  },
                  alternativas: {
                    type: 'array',
                    minItems: 2,
                    maxItems: 5,
                    items: { type: 'string' },
                    description: 'Alternativas da questão',
                  },
                  respostaCorreta: {
                    type: 'integer',
                    minimum: 0,
                    description: 'Índice da resposta correta',
                  },
                  explicacao: {
                    type: 'string',
                    description: 'Explicação da resposta',
                  },
                  nivel: {
                    type: 'string',
                    enum: ['facil', 'medio', 'dificil'],
                    default: 'medio',
                    description: 'Nível de dificuldade',
                  },
                },
              },
              examples: {
                questao: {
                  summary: 'Exemplo de questão semanal',
                  value: {
                    titulo: 'Questão Semanal #15 - Direito Constitucional',
                    description: 'Questão sobre princípios fundamentais',
                    concurso: 'OAB',
                    disciplina: 'Direito Constitucional',
                    semana: 15,
                    ano: 2024,
                    enunciado: 'Qual é o princípio fundamental da República Federativa do Brasil?',
                    alternativas: [
                      'A soberania',
                      'A cidadania',
                      'A dignidade da pessoa humana',
                      'O pluralismo político',
                    ],
                    respostaCorreta: 2,
                    explicacao: 'A dignidade da pessoa humana é o fundamento da República',
                    nivel: 'medio',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Questão semanal criada com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Questão semanal criada com sucesso' },
                    questao: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: 'questao-semanal-456' },
                        titulo: { type: 'string', example: 'Questão Semanal #15' },
                        dataCriacao: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Dados inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/mapa-assuntos': {
      get: {
        operationId: 'getMapaAssuntos',
        summary: 'Listar mapa de assuntos',
        description: 'Retorna o mapa de assuntos organizados por disciplina',
        tags: ['Mapa de Assuntos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'concurso',
            in: 'query',
            description: 'Filtrar por concurso',
            schema: { type: 'string' },
          },
          {
            name: 'disciplina',
            in: 'query',
            description: 'Filtrar por disciplina específica',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Mapa de assuntos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    mapa: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          disciplina: { type: 'string', example: 'Direito Constitucional' },
                          totalAssuntos: { type: 'integer', example: 25 },
                          assuntosEstudados: { type: 'integer', example: 15 },
                          progresso: { type: 'number', example: 0.6 },
                          assuntos: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string', example: 'assunto-1' },
                                nome: { type: 'string', example: 'Princípios Fundamentais' },
                                description: { type: 'string', example: 'Fundamentos da República' },
                                nivel: { type: 'string', example: 'basico' },
                                status: { type: 'string', example: 'estudado' },
                                questoes: { type: 'integer', example: 10 },
                                acertos: { type: 'integer', example: 8 },
                                taxaAcerto: { type: 'number', example: 0.8 },
                                tempoEstudo: { type: 'integer', example: 3600 },
                                subassuntos: {
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      id: { type: 'string', example: 'subassunto-1' },
                                      nome: { type: 'string', example: 'Dignidade da Pessoa Humana' },
                                      status: { type: 'string', example: 'estudado' },
                                      progresso: { type: 'number', example: 1.0 },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/mapa-assuntos/{id}': {
      get: {
        operationId: 'getMapaAssuntosById',
        summary: 'Buscar assunto por ID',
        description: 'Retorna detalhes completos de um assunto específico',
        tags: ['Mapa de Assuntos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID do assunto',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Detalhes do assunto',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    assunto: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: 'assunto-1' },
                        nome: { type: 'string', example: 'Princípios Fundamentais' },
                        description: { type: 'string', example: 'Fundamentos da República' },
                        disciplina: { type: 'string', example: 'Direito Constitucional' },
                        nivel: { type: 'string', example: 'basico' },
                        status: { type: 'string', example: 'estudado' },
                        questoes: { type: 'integer', example: 10 },
                        acertos: { type: 'integer', example: 8 },
                        taxaAcerto: { type: 'number', example: 0.8 },
                        tempoEstudo: { type: 'integer', example: 3600 },
                        dataInicio: { type: 'string', format: 'date' },
                        dataConclusao: { type: 'string', format: 'date' },
                        subassuntos: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', example: 'subassunto-1' },
                              nome: { type: 'string', example: 'Dignidade da Pessoa Humana' },
                              status: { type: 'string', example: 'estudado' },
                              progresso: { type: 'number', example: 1.0 },
                              questoes: { type: 'integer', example: 5 },
                              acertos: { type: 'integer', example: 4 },
                            },
                          },
                        },
                        recursos: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              tipo: { type: 'string', example: 'apostila' },
                              titulo: { type: 'string', example: 'Apostila de Direito Constitucional' },
                              url: { type: 'string', example: '/apostilas/direito-constitucional' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Assunto não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      put: {
        operationId: 'putMapaAssuntosById',
        summary: 'Atualizar status do assunto',
        description: 'Atualiza o status de estudo de um assunto',
        tags: ['Mapa de Assuntos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID do assunto',
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['nao_estudado', 'em_andamento', 'estudado', 'revisao'],
                    description: 'Novo status do assunto',
                  },
                  progresso: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                    description: 'Progresso do estudo (0-1)',
                  },
                  tempoEstudo: {
                    type: 'integer',
                    minimum: 0,
                    description: 'Tempo adicional de estudo em segundos',
                  },
                },
              },
              examples: {
                atualizacao: {
                  summary: 'Exemplo de atualização de status',
                  value: {
                    status: 'estudado',
                    progresso: 1.0,
                    tempoEstudo: 1800,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Status atualizado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Status atualizado com sucesso' },
                    assunto: { type: 'object' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Assunto não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/dashboard': {
      get: {
        operationId: 'getDashboard',
        summary: 'Obter dados do dashboard',
        description: 'Retorna dados consolidados para o dashboard do usuário',
        tags: ['Dashboard'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'periodo',
            in: 'query',
            description: 'Período para análise',
            schema: { type: 'string', enum: ['hoje', 'semana', 'mes'], default: 'semana' },
          },
        ],
        responses: {
          '200': {
            description: 'Dados do dashboard',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    dashboard: {
                      type: 'object',
                      properties: {
                        resumo: {
                          type: 'object',
                          properties: {
                            tempoEstudo: { type: 'integer', example: 7200 },
                            questoesRespondidas: { type: 'integer', example: 50 },
                            acertos: { type: 'integer', example: 40 },
                            taxaAcerto: { type: 'number', example: 0.8 },
                            streak: { type: 'integer', example: 7 },
                            ranking: { type: 'integer', example: 15 },
                          },
                        },
                        atividades: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              data: { type: 'string', format: 'date' },
                              tempoEstudado: { type: 'integer', example: 3600 },
                              questoes: { type: 'integer', example: 20 },
                              acertos: { type: 'integer', example: 16 },
                              disciplinas: { type: 'array', items: { type: 'string' } },
                            },
                          },
                        },
                        proximasAtividades: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              tipo: { type: 'string', example: 'simulado' },
                              titulo: { type: 'string', example: 'Simulado OAB' },
                              data: { type: 'string', format: 'date' },
                              prioridade: { type: 'string', example: 'alta' },
                            },
                          },
                        },
                        disciplinas: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              disciplina: { type: 'string', example: 'Direito Constitucional' },
                              progresso: { type: 'number', example: 0.75 },
                              questoes: { type: 'integer', example: 100 },
                              acertos: { type: 'integer', example: 75 },
                              tempoEstudo: { type: 'integer', example: 14400 },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/admin/clear-cache': {
      post: {
        operationId: 'postAdminClearCache',
        summary: 'Limpar cache do sistema',
        description: 'Limpa o cache do sistema (apenas administradores)',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  tipo: {
                    type: 'string',
                    enum: ['todos', 'usuarios', 'simulados', 'estatisticas'],
                    default: 'todos',
                    description: 'Tipo de cache a ser limpo',
                  },
                },
              },
              examples: {
                limpeza: {
                  summary: 'Exemplo de limpeza de cache',
                  value: {
                    tipo: 'todos',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cache limpo com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Cache limpo com sucesso' },
                    detalhes: {
                      type: 'object',
                      properties: {
                        tipo: { type: 'string', example: 'todos' },
                        itensRemovidos: { type: 'integer', example: 150 },
                        tempoExecucao: { type: 'number', example: 0.5 },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '403': {
            description: 'Acesso negado - requer privilégios de administrador',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/admin/database-usage': {
      get: {
        operationId: 'getAdminDatabaseUsage',
        summary: 'Obter estatísticas de uso do banco',
        description: 'Retorna estatísticas de uso do banco de dados (apenas administradores)',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Estatísticas de uso do banco',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    estatisticas: {
                      type: 'object',
                      properties: {
                        totalUsuarios: { type: 'integer', example: 1250 },
                        usuariosAtivos: { type: 'integer', example: 890 },
                        simuladosCriados: { type: 'integer', example: 45 },
                        questoesRespondidas: { type: 'integer', example: 15000 },
                        tamanhoBanco: { type: 'string', example: '2.5 GB' },
                        tabelas: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              nome: { type: 'string', example: 'usuarios' },
                              registros: { type: 'integer', example: 1250 },
                              tamanho: { type: 'string', example: '500 MB' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '403': {
            description: 'Acesso negado - requer privilégios de administrador',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/admin/validate-schema': {
      post: {
        operationId: 'postAdminValidateSchema',
        summary: 'Validar schema do banco',
        description: 'Valida a integridade do schema do banco de dados (apenas administradores)',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Resultado da validação',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    valido: { type: 'boolean', example: true },
                    detalhes: {
                      type: 'object',
                      properties: {
                        tabelasVerificadas: { type: 'integer', example: 15 },
                        tabelasValidas: { type: 'integer', example: 15 },
                        tabelasComErro: { type: 'integer', example: 0 },
                        erros: { type: 'array', items: { type: 'string' } },
                        avisos: { type: 'array', items: { type: 'string' } },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '403': {
            description: 'Acesso negado - requer privilégios de administrador',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/concursos': {
      get: {
        operationId: 'getConcursos',
        summary: 'Listar concursos',
        description: 'Lista todos os concursos com filtros e paginação',
        tags: ['Concursos'],
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Número da página',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Itens por página',
            schema: { type: 'integer', default: 10 },
          },
          {
            name: 'search',
            in: 'query',
            description: 'Termo de busca',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de concursos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Concurso' },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer', example: 1 },
                        limit: { type: 'integer', example: 10 },
                        total: { type: 'integer', example: 50 },
                        pages: { type: 'integer', example: 5 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'postConcursos',
        summary: 'Criar concurso',
        description: 'Cria um novo concurso (requer autenticação)',
        tags: ['Concursos'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ConcursoInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Concurso criado com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Concurso' },
              },
            },
          },
          '400': {
            description: 'Dados inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/concursos/{id}': {
      get: {
        operationId: 'getConcursoById',
        summary: 'Obter concurso por ID',
        description: 'Retorna os detalhes de um concurso específico',
        tags: ['Concursos'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID do concurso',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Detalhes do concurso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Concurso' },
              },
            },
          },
          '404': {
            description: 'Concurso não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      put: {
        operationId: 'putConcursoById',
        summary: 'Atualizar concurso',
        description: 'Atualiza um concurso existente (requer autenticação)',
        tags: ['Concursos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID do concurso',
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ConcursoInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Concurso atualizado com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Concurso' },
              },
            },
          },
          '400': {
            description: 'Dados inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Concurso não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      delete: {
        operationId: 'deleteConcursoById',
        summary: 'Excluir concurso',
        description: 'Exclui um concurso (requer autenticação)',
        tags: ['Concursos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID do concurso',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Concurso excluído com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Concurso excluído com sucesso' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Concurso não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/user': {
      get: {
        operationId: 'getUser',
        summary: 'Obter dados do usuário',
        description: 'Retorna os dados do usuário autenticado',
        tags: ['Usuário'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Dados do usuário',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/user/concurso-preference': {
      get: {
        operationId: 'getUserConcursoPreference',
        summary: 'Obter preferência de concurso',
        description: 'Retorna a preferência de concurso do usuário',
        tags: ['Usuário'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Preferência de concurso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        concursoId: { type: 'string', example: 'concurso-123' },
                        nome: { type: 'string', example: 'Concurso Exemplo' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        operationId: 'postUserConcursoPreference',
        summary: 'Criar preferência de concurso',
        description: 'Cria uma preferência de concurso para o usuário',
        tags: ['Usuário'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['concursoId'],
                properties: {
                  concursoId: {
                    type: 'string',
                    description: 'ID do concurso',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Preferência criada com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Preferência criada com sucesso' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Dados inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      put: {
        operationId: 'putUserConcursoPreference',
        summary: 'Atualizar preferência de concurso',
        description: 'Atualiza a preferência de concurso do usuário',
        tags: ['Usuário'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['concursoId'],
                properties: {
                  concursoId: {
                    type: 'string',
                    description: 'ID do concurso',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Preferência atualizada com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Preferência atualizada com sucesso' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Dados inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/conteudo/filtrado': {
      get: {
        operationId: 'getConteudoFiltrado',
        summary: 'Obter conteúdo filtrado',
        description: 'Retorna conteúdo filtrado por parâmetros',
        tags: ['Conteúdo'],
        parameters: [
          {
            name: 'tipo',
            in: 'query',
            description: 'Tipo de conteúdo',
            schema: { type: 'string', enum: ['apostila', 'flashcard', 'questao'] },
          },
          {
            name: 'concursoId',
            in: 'query',
            description: 'ID do concurso',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Conteúdo filtrado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/weak-points': {
      get: {
        operationId: 'getWeakPoints',
        summary: 'Obter pontos fracos',
        description: 'Retorna os pontos fracos do usuário',
        tags: ['Pontos Fracos'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Pontos fracos do usuário',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          disciplina: { type: 'string', example: 'Matemática' },
                          percentual: { type: 'number', example: 65.5 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/categoria-disciplinas': {
      get: {
        operationId: 'getCategoriaDisciplinas',
        summary: 'Listar categorias de disciplinas',
        description: 'Retorna todas as categorias de disciplinas',
        tags: ['Categorias'],
        responses: {
          '200': {
            description: 'Lista de categorias',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: 'cat-123' },
                          nome: { type: 'string', example: 'Exatas' },
                          description: { type: 'string', example: 'Disciplinas exatas' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/concurso-categorias': {
      get: {
        operationId: 'getConcursoCategorias',
        summary: 'Listar categorias de concurso',
        description: 'Retorna todas as categorias de concurso',
        tags: ['Categorias'],
        responses: {
          '200': {
            description: 'Lista de categorias',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: 'cat-123' },
                          nome: { type: 'string', example: 'Federal' },
                          description: { type: 'string', example: 'Concursos federais' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    parameters: {
      CorrelationId: {
        name: 'x-correlation-id',
        in: 'header',
        required: false,
        description: 'ID de correlação para rastreamento ponta a ponta',
        schema: { type: 'string' },
      },
    },
    schemas: {
      Error: ErrorSchema,
      Concurso: ConcursoSchema,
      ConcursoInput: ConcursoInputSchema,
      User: UserSchema,
      GuruEnhancedStats: {
        type: 'object',
        properties: {
          totalSimulados: { type: 'integer', example: 5 },
          totalQuestoes: { type: 'integer', example: 120 },
          totalStudyTime: { type: 'integer', example: 540 },
          averageScore: { type: 'number', example: 72.5 },
          accuracyRate: { type: 'number', example: 80.2 },
          approvalProbability: { type: 'number', example: 68.3 },
          studyStreak: { type: 'integer', example: 4 },
          weeklyProgress: {
            type: 'object',
            properties: {
              simulados: { type: 'integer', example: 2 },
              questoes: { type: 'integer', example: 45 },
              studyTime: { type: 'integer', example: 180 },
              scoreImprovement: { type: 'number', example: 3.4 },
            },
          },
          disciplinaStats: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                disciplina: { type: 'string', example: 'Português' },
                total_questions: { type: 'integer', example: 50 },
                resposta_corretas: { type: 'integer', example: 40 },
                accuracy_rate: { type: 'number', example: 80.0 },
                trend: { type: 'string', example: 'up' },
                color: { type: 'string', example: '#3B82F6' },
              },
            },
          },
          performanceHistory: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string', format: 'date' },
                score: { type: 'number' },
                timeSpent: { type: 'integer' },
              },
            },
          },
          goalProgress: {
            type: 'object',
            properties: {
              targetScore: { type: 'number' },
              currentScore: { type: 'number' },
              targetDate: { type: 'string', format: 'date' },
              daysRemaining: { type: 'integer' },
              onTrack: { type: 'boolean' },
            },
          },
          competitiveRanking: {
            type: 'object',
            properties: {
              position: { type: 'integer' },
              totalusuarios: { type: 'integer' },
              percentile: { type: 'number' },
            },
          },
        },
      },
      GuruActivity: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', example: 'simulado' },
          titulo: { type: 'string' },
          descricao: { type: 'string' },
          time: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          score: { type: 'number', nullable: true },
          improvement: { type: 'number', nullable: true },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  tags: [
    { name: 'Autenticação', description: 'Endpoints relacionados à autenticação de usuários' },
    { name: 'Concursos', description: 'Endpoints relacionados ao gerenciamento de concursos' },
    { name: 'Usuário', description: 'Endpoints relacionados aos dados do usuário' },
    { name: 'Conteúdo', description: 'Endpoints relacionados ao conteúdo filtrado' },
    { name: 'Pontos Fracos', description: 'Endpoints relacionados aos pontos fracos do usuário' },
    { name: 'Categorias', description: 'Endpoints relacionados às categorias' },
    { name: 'Apostilas', description: 'Endpoints relacionados ao gerenciamento de apostilas' },
    { name: 'Flashcards', description: 'Endpoints relacionados ao gerenciamento de flashcards' },
    { name: 'Simulados', description: 'Endpoints relacionados ao gerenciamento de simulados' },
    { name: 'Estatísticas', description: 'Endpoints relacionados à obtenção de estatísticas' },
    { name: 'Plano de Estudos', description: 'Endpoints relacionados ao gerenciamento de planos de estudo' },
    { name: 'Questões Semanais', description: 'Endpoints relacionados ao gerenciamento de questões semanais' },
    { name: 'Mapa de Assuntos', description: 'Endpoints relacionados ao mapa de assuntos e progresso' },
    { name: 'Dashboard', description: 'Endpoints relacionados ao dashboard do usuário' },
    { name: 'Admin', description: 'Endpoints administrativos para gerenciamento do sistema' },
    { name: 'Guru', description: 'Endpoints do módulo Guru da Aprovação' },
  ],
};

export function generateOpenAPISpec(): any {
  return openApiConfig as any;
}

export default openApiConfig;