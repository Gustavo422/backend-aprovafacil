#!/usr/bin/env node

import express from 'express';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Rota de teste
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API está funcionando!' });
});

// Rota para servir o JSON OpenAPI
app.get('/api/docs', (req, res) => {
  const spec = {
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
      '/health': {
        get: {
          summary: 'Health Check',
          description: 'Verifica se a API está funcionando',
          tags: ['Sistema'],
          responses: {
            '200': {
              description: 'API funcionando',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      message: { type: 'string', example: 'API está funcionando!' }
                    }
                  }
                }
              }
            }
          }
        }
      },
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
      },
      '/simulados': {
        get: {
          summary: 'Listar simulados',
          description: 'Retorna lista de simulados disponíveis',
          tags: ['Simulados'],
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
            },
            {
              name: 'nivel',
              in: 'query',
              description: 'Filtrar por nível',
              schema: { type: 'string', enum: ['basico', 'intermediario', 'avancado'] }
            }
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
                      simulados: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', example: 'simulado-123' },
                            titulo: { type: 'string', example: 'Simulado OAB - Direito Constitucional' },
                            descricao: { type: 'string', example: 'Simulado completo de Direito Constitucional' },
                            concurso: { type: 'string', example: 'OAB' },
                            disciplina: { type: 'string', example: 'Direito Constitucional' },
                            nivel: { type: 'string', example: 'intermediario' },
                            totalQuestoes: { type: 'integer', example: 50 },
                            tempoLimite: { type: 'integer', example: 3600 },
                            pontuacaoMaxima: { type: 'integer', example: 100 }
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
      '/estatisticas': {
        get: {
          summary: 'Obter estatísticas',
          description: 'Retorna estatísticas do usuário',
          tags: ['Estatísticas'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'periodo',
              in: 'query',
              description: 'Período para análise',
              schema: { type: 'string', enum: ['dia', 'semana', 'mes', 'ano'], default: 'mes' }
            }
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
                          flashcardsEstudados: { type: 'integer', example: 200 }
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
      '/plano-estudos': {
        get: {
          summary: 'Listar planos de estudo',
          description: 'Retorna lista de planos de estudo do usuário',
          tags: ['Plano de Estudos'],
          security: [{ bearerAuth: [] }],
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
                            progresso: { type: 'number', example: 0.65 }
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
        name: 'Sistema',
        description: 'Endpoints relacionados ao sistema'
      },
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
      },
      {
        name: 'Simulados',
        description: 'Endpoints relacionados ao gerenciamento de simulados'
      },
      {
        name: 'Estatísticas',
        description: 'Endpoints relacionados à obtenção de estatísticas'
      },
      {
        name: 'Plano de Estudos',
        description: 'Endpoints relacionados ao gerenciamento de planos de estudo'
      }
    ]
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify(spec, null, 2));
});

// Rota para servir a interface Swagger UI
app.get('/api/docs/swagger', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AprovaFácil API - Documentação</title>
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
        .swagger-ui .info .title {
            color: #2c3e50;
            font-size: 36px;
        }
        .swagger-ui .info .description {
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
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('🚀 Servidor iniciado com sucesso!');
  console.log(`📍 Porta: ${PORT}`);
  console.log(`🌐 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📚 Documentação OpenAPI: http://localhost:${PORT}/api/docs`);
  console.log(`🔍 Swagger UI: http://localhost:${PORT}/api/docs/swagger`);
  console.log('\n✨ Para testar a documentação:');
  console.log(`   1. Abra: http://localhost:${PORT}/api/docs/swagger`);
  console.log(`   2. Ou acesse o JSON: http://localhost:${PORT}/api/docs`);
});

// Tratamento de erros
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
  process.exit(1);
}); 