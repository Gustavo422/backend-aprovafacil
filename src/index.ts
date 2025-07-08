/* eslint-disable */
import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import * as cors from 'cors';
import * as helmet from 'helmet';
import * as morgan from 'morgan';
import * as swaggerUi from 'swagger-ui-express';
import { specs } from './swagger-config.js';
import 'dotenv/config';
import * as compression from 'compression';
import rateLimit from 'express-rate-limit';
import { supabase } from './config/supabase.js';
import { logger } from './utils/logger.js';
import dotenv from 'dotenv';
import authLoginRouter from './api/auth/login/route.js';
dotenv.config();

const app = express.default();
const PORT = process.env['PORT'] || 5000;

// Middleware
app.use(cors.default());
app.use(helmet.default());
app.use(morgan.default('dev'));
app.use(express.json());
app.use(compression.default());

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requests por IP
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente em 15 minutos.'
  }
});
app.use(limiter);

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, undefined, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Importar rotas
import concursosRouter from './api/concursos/route.js';
import apostilasRouter from './api/apostilas/route.js';
import flashcardsRouter from './api/flashcards/route.js';

// Swagger UI - Documentação da API
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AprovaFácil API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    tryItOutEnabled: true
  }
}));

// Rota para servir o JSON OpenAPI
app.get('/api/docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

import { healthChecker } from './utils/health-checker.js';
import { performanceMonitor } from './middleware/performance-monitor.js';
import { statusDashboard } from './utils/status-dashboard.js';
import { WebDashboard } from './utils/web-dashboard.js';

// Middleware de performance
app.use(performanceMonitor.middleware());

// Rota de health check simples
app.get('/api/health', (req: Request, res: Response) => {
  const status = healthChecker.getSimpleStatus();
  res.status(200).json(status);
});

// Rota de health check detalhado
app.get('/api/health/detailed', async (req: Request, res: Response) => {
  try {
    const health = await healthChecker.getHealthStatus();
    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar saúde do sistema' });
  }
});

// Rota de métricas de performance
app.get('/api/metrics', (req: Request, res: Response) => {
  const metrics = performanceMonitor.getMetrics();
  const slowestEndpoints = performanceMonitor.getSlowestEndpoints(5);
  
  res.status(200).json({
    metrics,
    slowestEndpoints
  });
});

// Rotas da API
app.use('/api/concursos', concursosRouter);
app.use('/api/apostilas', apostilasRouter);
app.use('/api/flashcards', flashcardsRouter);
app.use('/api/auth/login', authLoginRouter);

// Rota para servir o JSON OpenAPI
app.get('/api/docs', (req: Request, res: Response) => {
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
        name: 'Sistema',
        description: 'Endpoints relacionados ao sistema e monitoramento'
      },
      {
        name: 'Autenticação',
        description: 'Endpoints relacionados à autenticação de usuários'
      },
      {
        name: 'Concursos',
        description: 'Endpoints relacionados ao gerenciamento de concursos'
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
app.get('/api/docs/swagger', (req: Request, res: Response) => {
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

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API funcionando corretamente',
    timestamp: new Date().toISOString(),
    version: process.env['npm_package_version'] || '1.0.0'
  });
});

// Teste de conexão com Supabase
app.get('/api/test-connection', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('concursos')
      .select('count', { count: 'exact', head: true });

    if (error) {
      logger.error('Erro na conexão com Supabase:', undefined, { error });
      res.status(500).json({
        success: false,
        error: 'Erro na conexão com o banco de dados'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Conexão com Supabase estabelecida com sucesso',
      data: {
        totalConcursos: data
      }
    });
  } catch (error) {
    logger.error('Erro ao testar conexão:', undefined, { error });
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Middleware de tratamento de erros
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Erro não tratado:', undefined, { error: err });
  
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env['NODE_ENV'] === 'development' ? err.message : 'Algo deu errado'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔗 API base: http://localhost:${PORT}/api`);
  logger.info(`🌍 Ambiente: ${process.env['NODE_ENV'] || 'development'}`);
  logger.info(`Documentação OpenAPI: http://localhost:${PORT}/api/docs`);
  logger.info(`Swagger UI: http://localhost:${PORT}/api/docs/swagger`);
  
  // Iniciar central de monitoramento web
  if (process.env['NODE_ENV'] === 'development') {
    setTimeout(() => {
      const webDashboard = new WebDashboard();
      webDashboard.start();
      console.log('🎯 Central de monitoramento web iniciada em http://localhost:3001');
    }, 2000);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido. Encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido. Encerrando servidor...');
  process.exit(0);
});

export default app; 
