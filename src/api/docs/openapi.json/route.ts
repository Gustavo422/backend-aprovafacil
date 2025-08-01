import { Request, Response } from 'express';
import { logger } from '../../../lib/logger.js';

export const GET = async (req: Request, res: Response) => {
  try {
    logger.info('Gerando documentação OpenAPI');
    
    // Especificação OpenAPI completa
    const openapiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'AprovaFacil API',
        version: '1.0.0',
        description: 'API para o sistema AprovaFacil',
      },
      servers: [
        {
          url: 'http://localhost:5000',
          description: 'Servidor de desenvolvimento',
        },
      ],
      paths: {
        '/auth/login': {
          post: {
            summary: 'Login do usuário',
            tags: ['Autenticação'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      email: { type: 'string' },
                      password: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Login bem-sucedido',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        token: { type: 'string' },
                        user: { type: 'object' },
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
            summary: 'Registro de usuário',
            tags: ['Autenticação'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      email: { type: 'string' },
                      password: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              '201': {
                description: 'Usuário criado com sucesso',
              },
            },
          },
        },
        '/concursos': {
          get: {
            summary: 'Listar concursos',
            tags: ['Concursos'],
            responses: {
              '200': {
                description: 'Lista de concursos',
              },
            },
          },
        },
        '/simulados': {
          get: {
            summary: 'Listar simulados',
            tags: ['Simulados'],
            responses: {
              '200': {
                description: 'Lista de simulados',
              },
            },
          },
        },
        '/flashcards': {
          get: {
            summary: 'Listar flashcards',
            tags: ['Flashcards'],
            responses: {
              '200': {
                description: 'Lista de flashcards',
              },
            },
          },
        },
        '/estatisticas': {
          get: {
            summary: 'Obter estatísticas',
            tags: ['Estatísticas'],
            responses: {
              '200': {
                description: 'Estatísticas do usuário',
              },
            },
          },
        },
        '/dashboard': {
          get: {
            summary: 'Dashboard do usuário',
            tags: ['Dashboard'],
            responses: {
              '200': {
                description: 'Dados do dashboard',
              },
            },
          },
        },
        '/apostilas': {
          get: {
            summary: 'Listar apostilas',
            tags: ['Apostilas'],
            responses: {
              '200': {
                description: 'Lista de apostilas',
              },
            },
          },
        },
        '/plano-estudos': {
          get: {
            summary: 'Listar planos de estudo',
            tags: ['Plano de Estudos'],
            responses: {
              '200': {
                description: 'Lista de planos de estudo',
              },
            },
          },
        },
        '/questoes-semanais': {
          get: {
            summary: 'Listar questões semanais',
            tags: ['Questões Semanais'],
            responses: {
              '200': {
                description: 'Lista de questões semanais',
              },
            },
          },
        },
        '/mapa-assuntos': {
          get: {
            summary: 'Listar mapa de assuntos',
            tags: ['Mapa de Assuntos'],
            responses: {
              '200': {
                description: 'Mapa de assuntos',
              },
            },
          },
        },
        '/categoria-disciplinas': {
          get: {
            summary: 'Listar categorias de disciplinas',
            tags: ['Categorias'],
            responses: {
              '200': {
                description: 'Lista de categorias de disciplinas',
              },
            },
          },
        },
        '/concurso-categorias': {
          get: {
            summary: 'Listar categorias de concurso',
            tags: ['Categorias'],
            responses: {
              '200': {
                description: 'Lista de categorias de concurso',
              },
            },
          },
        },
        '/user': {
          get: {
            summary: 'Obter dados do usuário',
            tags: ['Usuário'],
            responses: {
              '200': {
                description: 'Dados do usuário',
              },
            },
          },
        },
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
            },
          },
          Concurso: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              nome: { type: 'string' },
              descricao: { type: 'string' },
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
      security: [
        {
          bearerAuth: [],
        },
      ],
    };

    return res.json(openapiSpec);
  } catch (error) {
    logger.error('Erro ao gerar documentação OpenAPI:', { error });
    return res.status(500).json({ error: 'Erro ao gerar documentação' });
  }
}; 



