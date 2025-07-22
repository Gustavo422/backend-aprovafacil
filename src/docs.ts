// Documentação OpenAPI em TypeScript
export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    titulo: 'AprovaFácil API',
    descricao: 'API para sistema de estudos e preparação para concursos',
    version: '1.0.0',
    contact: {
      nome: 'AprovaFacil Team',
      email: 'contato@aprovafacil.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      descricao: 'Servidor de desenvolvimento'
    },
    {
      url: 'https://api.aprovafacil.com',
      descricao: 'Servidor de produção'
    }
  ],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Autenticar usuário',
        descricao: 'Realiza login do usuário com email e senha',
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
                    descricao: 'Email do usuário'
                  },
                  senha: {
                    type: 'string',
                    minLength: 6,
                    descricao: 'Senha do usuário'
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
            descricao: 'Login realizado com sucesso',
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
            descricao: 'Dados inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '401': {
            descricao: 'Credenciais inválidas',
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
        descricao: 'Cria uma nova conta de usuário',
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
                    descricao: 'Email do usuário'
                  },
                  senha: {
                    type: 'string',
                    minLength: 6,
                    descricao: 'Senha do usuário'
                  },
                  nome: {
                    type: 'string',
                    minLength: 2,
                    descricao: 'Nome completo do usuário'
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
            descricao: 'Usuário criado com sucesso',
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
            descricao: 'Dados inválidos',
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
        descricao: 'Retorna lista de apostilas disponíveis',
        tags: ['Apostilas'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            nome: 'concurso',
            in: 'query',
            descricao: 'Filtrar por concurso',
            schema: { type: 'string' }
          },
          {
            nome: 'disciplina',
            in: 'query',
            descricao: 'Filtrar por disciplina',
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            descricao: 'Lista de apostilas',
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
            descricao: 'Não autorizado',
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
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Mensagem de erro' },
          message: { type: 'string', example: 'Descrição detalhada do erro' }
        }
      }
    }
  },
  tags: [
    {
      nome: 'Autenticação',
      descricao: 'Endpoints relacionados à autenticação de usuários'
    },
    {
      nome: 'Apostilas',
      descricao: 'Endpoints relacionados ao gerenciamento de apostilas'
    }
  ]
};

export function generateOpenAPISpec(): object {
  return openApiSpec;
}

export function serveSwaggerUI(): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta nome="viewport" content="width=device-width, initial-scale=1.0">
    <titulo>AprovaFácil API - Documentação</titulo>
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #fafafa;
        }
        .swagger-ui .topbar {
            background-color: #2c3e50;
            padding: 10px 0;
        }
        .swagger-ui .topbar .download-url-wrapper .select-label {
            color: #fff;
        }
        .swagger-ui .info .titulo {
            color: #2c3e50;
            font-size: 36px;
        }
        .swagger-ui .info .descricao {
            font-size: 16px;
            line-height: 1.5;
        }
        #swagger-ui {
            padding: 20px;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
    
    <script>
        window.onload = function() {
            console.log('Iniciando Swagger UI...');
            
            try {
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
                    layout: "BaseLayout",
                    validatorUrl: null,
                    docExpansion: "list",
                    filter: true,
                    showRequestHeaders: true,
                    tryItOutEnabled: true,
                    onComplete: function() {
                        console.log('Swagger UI carregado com sucesso!');
                    },
                    onFailure: function(data) {
                        console.error('Erro ao carregar Swagger UI:', data);
                    }
                });
                
                console.log('Swagger UI configurado');
            } catch (error) {
                console.error('Erro na configuração do Swagger UI:', error);
                document.getElementById('swagger-ui').innerHTML = 
                    '<div style="padding: 20px; text-align: center; color: red;">' +
                    '<h2>Erro ao carregar a documentação</h2>' +
                    '<p>Erro: ' + error.message + '</p>' +
                    '<p><a href="/api/docs" target="_blank">Ver documentação JSON</a></p>' +
                    '</div>';
            }
        };
    </script>
</body>
</html>
  `;
} 



