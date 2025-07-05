/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// TODO: Refatorar para backend puro. Blocos comentados por depender de variáveis globais Node.js/browser/SSR.
/*
// Caminhos importantes
const API_DIR = path.join(__dirname, '..', 'app', 'api');
const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'api');
const OPENAPI_SPEC_PATH = path.join(__dirname, '..', 'openapi.json');

// Cria o diretório de saída se não existir
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Esquema OpenAPI base
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'API AprovaJá',
    description: 'Documentação da API do AprovaJá',
    version: '1.0.0',
    contact: {
      name: 'Suporte AprovaJá',
      email: 'suporte@aprova-ja.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Servidor de Desenvolvimento'
    },
    {
      url: 'https://api.aprova-ja.com',
      description: 'Produção'
    }
  ],
  paths: {},
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
          error: {
            type: 'string',
            description: 'Mensagem de erro',
            example: 'Erro ao processar a requisição'
          },
          statusCode: {
            type: 'integer',
            description: 'Código de status HTTP',
            example: 400
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

// Função para adicionar documentação de um endpoint
function addEndpoint(method, path, doc) {
  if (!openApiSpec.paths[path]) {
    openApiSpec.paths[path] = {};
  }
  
  openApiSpec.paths[path][method.toLowerCase()] = {
    summary: doc.summary || '',
    description: doc.description || '',
    tags: doc.tags || [],
    parameters: doc.parameters || [],
    requestBody: doc.requestBody,
    responses: {
      '200': {
        description: 'Requisição bem-sucedida',
        content: doc.responses?.['200']?.content || {}
      },
      '400': {
        description: 'Requisição inválida',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      '401': {
        description: 'Não autorizado',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      '500': {
        description: 'Erro interno do servidor',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    },
    security: doc.security || [{ bearerAuth: [] }]
  };
}

// Documentação para o endpoint de autenticação
addEndpoint('post', '/auth/login', {
  summary: 'Autentica um usuário',
  description: 'Realiza o login do usuário e retorna um token de autenticação. Possui rate limiting de 5 tentativas a cada 15 minutos por IP.',
  tags: ['Autenticação'],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'E-mail do usuário',
              example: 'usuario@exemplo.com'
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Senha do usuário',
              example: 'suaSenha123'
            }
          }
        }
      }
    }
  },
  responses: {
    '200': {
      description: 'Autenticação bem-sucedida',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
                      email: { type: 'string', example: 'usuario@exemplo.com' },
                      // Outros campos do usuário conforme retornado pelo Supabase
                    }
                  },
                  session: {
                    type: 'object',
                    properties: {
                      access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                      refresh_token: { type: 'string' },
                      expires_in: { type: 'number' },
                      token_type: { type: 'string' },
                      user: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '400': {
      description: 'Credenciais inválidas ou faltando',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  code: { 
                    type: 'string', 
                    enum: ['MISSING_CREDENTIALS', 'INVALID_CREDENTIALS'],
                    example: 'INVALID_CREDENTIALS' 
                  },
                  message: { type: 'string', example: 'Email ou senha inválidos' }
                }
              }
            }
          }
        }
      }
    },
    '429': {
      description: 'Muitas tentativas de login',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
                  message: { type: 'string', example: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
                  retryAfter: { type: 'number', example: 900000 }
                }
              }
            }
          }
        }
      }
    }
  },
  security: [] // Endpoint público
});

// Documentação para o endpoint de dashboard
addEndpoint('get', '/dashboard', {
  summary: 'Obtém dados do dashboard do usuário',
  description: 'Retorna estatísticas e informações para o dashboard do usuário autenticado',
  tags: ['Dashboard'],
  responses: {
    '200': {
      description: 'Dados do dashboard retornados com sucesso',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              totalSimulados: { type: 'number', example: 5, description: 'Total de simulados realizados pelo usuário' },
              totalQuestoes: { type: 'number', example: 150, description: 'Total de questões respondidas' },
              // Outras estatísticas retornadas pelo endpoint
            }
          }
        }
      }
    },
    '401': {
      description: 'Não autorizado - token inválido ou ausente',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/Error'
          }
        }
      }
    },
    '500': {
      description: 'Erro interno do servidor',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/Error'
          }
        }
      }
    }
  }
});

// Documentação para o endpoint de recuperação de senha
addEndpoint('post', '/auth/forgot-password', {
  summary: 'Solicita recuperação de senha',
  description: 'Envia um e-mail com um link para redefinição de senha',
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
              description: 'E-mail do usuário',
              example: 'usuario@exemplo.com'
            }
          }
        }
      }
    }
  },
  responses: {
    '200': {
      description: 'E-mail de recuperação enviado com sucesso',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'E-mail de recuperação enviado com sucesso' }
            }
          }
        }
      }
    },
    '400': {
      description: 'E-mail inválido ou não encontrado',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/Error'
          }
        }
      }
    }
  },
  security: [] // Endpoint público
});

// Salva o arquivo OpenAPI
fs.writeFileSync(
  OPENAPI_SPEC_PATH,
  JSON.stringify(openApiSpec, null, 2)
);

console.log(`Documentação OpenAPI gerada em: ${OPENAPI_SPEC_PATH}`);

// Gera documentação interativa usando o Swagger UI
const swaggerUiDist = 'node_modules/swagger-ui-dist';
if (fs.existsSync(swaggerUiDist)) {
  const swaggerUiDir = path.join(OUTPUT_DIR, 'swagger-ui');
  if (!fs.existsSync(swaggerUiDir)) {
    fs.mkdirSync(swaggerUiDir, { recursive: true });
  }
  
  // Copia os arquivos do Swagger UI
  fs.cpSync(swaggerUiDist, swaggerUiDir, { recursive: true });
  
  // Cria o arquivo HTML personalizado
  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <title>API AprovaJá - Documentação</title>
    <link rel="stylesheet" type="text/css" href="./swagger-ui/swagger-ui.css" />
    <link rel="icon" type="image/png" href="./favicon-32x32.png" sizes="32x32" />
    <style>
      html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
      *, *:before, *:after { box-sizing: inherit; }
      body { margin: 0; background: #fafafa; }
      .swagger-ui .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="./swagger-ui/swagger-ui-bundle.js"></script>
    <script src="./swagger-ui/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function() {
        const ui = SwaggerUIBundle({
          url: "openapi.json",
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          plugins: [
            SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: "StandaloneLayout"
        });
        window.ui = ui;
      };
    </script>
  </body>
  </html>
  `;
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html);
  fs.copyFileSync(OPENAPI_SPEC_PATH, path.join(OUTPUT_DIR, 'openapi.json'));
  
  console.log(`Documentação interativa disponível em: ${path.join(OUTPUT_DIR, 'index.html')}`);
} else {
  console.warn('Swagger UI não encontrado. Instale-o com: npm install --save-dev swagger-ui-dist');
}

console.log('Documentação da API gerada com sucesso!');
*/
