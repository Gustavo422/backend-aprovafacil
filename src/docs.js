// Documentação OpenAPI em JavaScript puro
export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'AprovaFácil API',
    description: 'API para sistema de estudos e preparação para concursos',
    version: '1.0.0',
    contact: {
      name: 'AprovaFacil Team',
      email: 'contato@aprovafacil.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Servidor de desenvolvimento'
    },
    {
      url: 'https://api.aprovafacil.com',
      description: 'Servidor de produção'
    }
  ],
  paths: {
    '/auth/login': {
      post: {
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
                    description: 'Email do usuário'
                  },
                  senha: {
                    type: 'string',
                    minLength: 6,
                    description: 'Senha do usuário'
                  }
                }
              },
              examples: {
                login: {
                  summary: 'Exemplo de login',
                  value: {
                    email: 'usuario@exemplo.com',
                    senha: 'senha123'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login realizado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: 'user-123' },
                        email: { type: 'string', example: 'usuario@exemplo.com' },
                        nome: { type: 'string', example: 'João Silva' }
                      }
                    },
                    message: { type: 'string', example: 'Login realizado com sucesso' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Dados inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '401': {
            description: 'Credenciais inválidas',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Registrar novo usuário',
        description: 'Cria uma nova conta de usuário',
        tags: ['Autenticação'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'senha', 'nome'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    description: 'Email do usuário'
                  },
                  senha: {
                    type: 'string',
                    minLength: 6,
                    description: 'Senha do usuário'
                  },
                  nome: {
                    type: 'string',
                    minLength: 2,
                    description: 'Nome completo do usuário'
                  }
                }
              },
              examples: {
                register: {
                  summary: 'Exemplo de registro',
                  value: {
                    email: 'novo@exemplo.com',
                    senha: 'senha123',
                    nome: 'Maria Silva'
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Usuário criado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Usuário criado com sucesso' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: 'user-456' },
                        email: { type: 'string', example: 'novo@exemplo.com' }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Dados inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/apostilas': {
      get: {
        summary: 'Listar apostilas',
        description: 'Retorna lista de apostilas disponíveis',
        tags: ['Apostilas'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'concurso',
            in: 'query',
            description: 'Filtrar por concurso',
            schema: { type: 'string' }
          },
          {
            name: 'disciplina',
            in: 'query',
            description: 'Filtrar por disciplina',
            schema: { type: 'string' }
          }
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
                          titulo: { type: 'string', example: 'Apostila de Direito Constitucional' },
                          descricao: { type: 'string', example: 'Apostila completa de Direito Constitucional' },
                          concurso: { type: 'string', example: 'OAB' },
                          disciplina: { type: 'string', example: 'Direito Constitucional' },
                          tamanho: { type: 'string', example: '2.5 MB' },
                          dataCriacao: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/flashcards': {
      get: {
        summary: 'Listar flashcards',
        description: 'Retorna lista de flashcards disponíveis',
        tags: ['Flashcards'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'disciplina',
            in: 'query',
            description: 'Filtrar por disciplina',
            schema: { type: 'string' }
          },
          {
            name: 'nivel',
            in: 'query',
            description: 'Filtrar por nível',
            schema: { type: 'string', enum: ['facil', 'medio', 'dificil'] }
          }
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
                          pergunta: { type: 'string', example: 'Qual é o princípio fundamental?' },
                          resposta: { type: 'string', example: 'A dignidade da pessoa humana' },
                          disciplina: { type: 'string', example: 'Direito Constitucional' },
                          nivel: { type: 'string', example: 'medio' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Não autorizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Mensagem de erro'
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'ERROR_CODE'
              },
              message: {
                type: 'string',
                example: 'Mensagem de erro'
              }
            }
          }
        }
      }
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  tags: [
    {
      name: 'Autenticação',
      description: 'Endpoints relacionados à autenticação de usuários'
    },
    {
      name: 'Apostilas',
      description: 'Endpoints relacionados ao gerenciamento de apostilas'
    },
    {
      name: 'Flashcards',
      description: 'Endpoints relacionados ao gerenciamento de flashcards'
    }
  ]
};

export function generateOpenAPISpec() {
  return openApiSpec;
}

export function serveSwaggerUI() {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AprovaFácil API - Documentação</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <style>
        html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        body {
            margin:0;
            background: #fafafa;
        }
        .swagger-ui .topbar {
            background-color: #2c3e50;
        }
        .swagger-ui .topbar .download-url-wrapper .select-label {
            color: #fff;
        }
        .swagger-ui .info .title {
            color: #2c3e50;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '/api/docs',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                validatorUrl: null,
                docExpansion: "list",
                filter: true,
                showRequestHeaders: true,
                tryItOutEnabled: true,
                requestInterceptor: function(request) {
                    // Adicionar token de autenticação se disponível
                    const token = localStorage.getItem('auth_token');
                    if (token) {
                        request.headers.Authorization = 'Bearer ' + token;
                    }
                    return request;
                }
            });
        };
    </script>
</body>
</html>
  `;
} 