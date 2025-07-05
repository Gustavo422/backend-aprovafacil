import { OpenAPIV3 } from 'openapi-types';

export const openApiConfig: OpenAPIV3.Document = {
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
      url: 'http://localhost:3000/api',
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
                    success: {
                      type: 'boolean',
                      example: true
                    },
                    user: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          example: 'user-123'
                        },
                        email: {
                          type: 'string',
                          example: 'usuario@exemplo.com'
                        },
                        nome: {
                          type: 'string',
                          example: 'João Silva'
                        }
                      }
                    },
                    message: {
                      type: 'string',
                      example: 'Login realizado com sucesso'
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
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: false
                    },
                    error: {
                      type: 'object',
                      properties: {
                        code: {
                          type: 'string',
                          example: 'VALIDATION_ERROR'
                        },
                        message: {
                          type: 'string',
                          example: 'Dados inválidos'
                        },
                        details: {
                          type: 'array',
                          items: {
                            type: 'object'
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
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
                      example: false
                    },
                    error: {
                      type: 'object',
                      properties: {
                        code: {
                          type: 'string',
                          example: 'INVALID_CREDENTIALS'
                        },
                        message: {
                          type: 'string',
                          example: 'Email ou senha incorretos'
                        }
                      }
                    }
                  }
                }
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
                required: ['email', 'senha', 'nome', 'password'],
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
                  password: {
                    type: 'string',
                    minLength: 6,
                    description: 'Senha do usuário (alias para senha)'
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
                    nome: 'Maria Silva',
                    password: 'senha123'
                  }
                }
              }
            }
          }
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
                      example: true
                    },
                    message: {
                      type: 'string',
                      example: 'Usuário criado com sucesso'
                    },
                    user: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          example: 'user-123'
                        },
                        email: {
                          type: 'string',
                          example: 'novo@exemplo.com'
                        },
                        nome: {
                          type: 'string',
                          example: 'Maria Silva'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/auth/forgot-password': {
      post: {
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
                    description: 'Email do usuário'
                  }
                }
              },
              examples: {
                forgot: {
                  summary: 'Exemplo de solicitação',
                  value: {
                    email: 'usuario@exemplo.com'
                  }
                }
              }
            }
          }
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
                    message: { type: 'string', example: 'Email enviado com sucesso' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Email inválido',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/auth/reset-password': {
      post: {
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
                  novaSenha: { type: 'string', minLength: 6, description: 'Nova senha' }
                }
              },
              examples: {
                reset: {
                  summary: 'Exemplo de redefinição',
                  value: {
                    token: 'abcdef123456',
                    novaSenha: 'novasenha123'
                  }
                }
              }
            }
          }
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
                    message: { type: 'string', example: 'Senha redefinida com sucesso' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Token inválido ou senha fraca',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/auth/verify-reset-token': {
      post: {
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
                  token: { type: 'string', description: 'Token de redefinição' }
                }
              },
              examples: {
                verify: {
                  summary: 'Exemplo de verificação',
                  value: {
                    token: 'abcdef123456'
                  }
                }
              }
            }
          }
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
                    message: { type: 'string', example: 'Token válido' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Token inválido ou expirado',
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
        description: 'Retorna lista de apostilas disponíveis com filtros opcionais',
        tags: ['Apostilas'],
        parameters: [
          {
            name: 'id',
            in: 'query',
            description: 'ID da apostila específica',
            schema: { type: 'string' }
          },
          {
            name: 'categoria',
            in: 'query',
            description: 'Filtrar por categoria',
            schema: { type: 'string' }
          },
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
            name: 'limit',
            in: 'query',
            description: 'Número máximo de resultados',
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 }
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Número de resultados para pular',
            schema: { type: 'integer', default: 0, minimum: 0 }
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
                          titulo: { type: 'string', example: 'Direito Constitucional' },
                          categoria: { type: 'string', example: 'Direito' },
                          disciplina: { type: 'string', example: 'Constitucional' },
                          concurso: { type: 'string', example: 'OAB' },
                          descricao: { type: 'string', example: 'Apostila completa sobre Direito Constitucional' },
                          autor: { type: 'string', example: 'Prof. Silva' },
                          dataCriacao: { type: 'string', format: 'date-time' },
                          tamanho: { type: 'integer', example: 2048576 },
                          paginas: { type: 'integer', example: 150 },
                          avaliacao: { type: 'number', example: 4.5 },
                          downloads: { type: 'integer', example: 1250 }
                        }
                      }
                    },
                    paginacao: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 50 },
                        limit: { type: 'integer', example: 20 },
                        offset: { type: 'integer', example: 0 },
                        paginas: { type: 'integer', example: 3 }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Parâmetros inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      post: {
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
                    description: 'Título da apostila'
                  },
                  categoria: {
                    type: 'string',
                    description: 'Categoria da apostila'
                  },
                  disciplina: {
                    type: 'string',
                    description: 'Disciplina da apostila'
                  },
                  concurso: {
                    type: 'string',
                    description: 'Concurso relacionado'
                  },
                  descricao: {
                    type: 'string',
                    maxLength: 1000,
                    description: 'Descrição da apostila'
                  },
                  autor: {
                    type: 'string',
                    description: 'Autor da apostila'
                  },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Tags para categorização'
                  },
                  visibilidade: {
                    type: 'string',
                    enum: ['publica', 'privada'],
                    default: 'publica',
                    description: 'Visibilidade da apostila'
                  }
                }
              },
              examples: {
                apostila: {
                  summary: 'Exemplo de criação de apostila',
                  value: {
                    titulo: 'Direito Administrativo',
                    categoria: 'Direito',
                    disciplina: 'Administrativo',
                    concurso: 'OAB',
                    descricao: 'Apostila completa sobre Direito Administrativo',
                    autor: 'Prof. Santos',
                    tags: ['direito', 'administrativo', 'oab'],
                    visibilidade: 'publica'
                  }
                }
              }
            }
          }
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
                        dataCriacao: { type: 'string', format: 'date-time' }
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
    '/apostilas/{id}': {
      get: {
        summary: 'Buscar apostila por ID',
        description: 'Retorna detalhes completos de uma apostila específica',
        tags: ['Apostilas'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID da apostila',
            schema: { type: 'string' }
          }
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
                        descricao: { type: 'string', example: 'Apostila completa sobre Direito Constitucional' },
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
                              paginas: { type: 'integer', example: 15 }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Apostila não encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      put: {
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
            schema: { type: 'string' }
          }
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
                  descricao: { type: 'string', maxLength: 1000 },
                  autor: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  visibilidade: { type: 'string', enum: ['publica', 'privada'] }
                }
              }
            }
          }
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
                    apostila: { type: 'object' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Apostila não encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      delete: {
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
            schema: { type: 'string' }
          }
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
                    message: { type: 'string', example: 'Apostila excluída com sucesso' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Apostila não encontrada',
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
        description: 'Retorna lista de flashcards com filtros opcionais',
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
            name: 'tema',
            in: 'query',
            description: 'Filtrar por tema',
            schema: { type: 'string' }
          },
          {
            name: 'subtema',
            in: 'query',
            description: 'Filtrar por subtema',
            schema: { type: 'string' }
          },
          {
            name: 'concurso',
            in: 'query',
            description: 'Filtrar por concurso',
            schema: { type: 'string' }
          },
          {
            name: 'dificuldade',
            in: 'query',
            description: 'Filtrar por dificuldade',
            schema: { type: 'string', enum: ['facil', 'medio', 'dificil'] }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Número máximo de resultados',
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 }
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Número de resultados para pular',
            schema: { type: 'integer', default: 0, minimum: 0 }
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
                          nivel: { type: 'integer', example: 3 }
                        }
                      }
                    },
                    paginacao: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 150 },
                        limit: { type: 'integer', example: 20 },
                        offset: { type: 'integer', example: 0 },
                        paginas: { type: 'integer', example: 8 }
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
      },
      post: {
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
                    description: 'Frente do flashcard'
                  },
                  back: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 1000,
                    description: 'Verso do flashcard'
                  },
                  disciplina: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 100,
                    description: 'Disciplina do flashcard'
                  },
                  tema: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 100,
                    description: 'Tema do flashcard'
                  },
                  subtema: {
                    type: 'string',
                    maxLength: 100,
                    description: 'Subtema do flashcard'
                  },
                  concurso: {
                    type: 'string',
                    maxLength: 100,
                    description: 'Concurso relacionado'
                  },
                  dificuldade: {
                    type: 'string',
                    enum: ['facil', 'medio', 'dificil'],
                    default: 'medio',
                    description: 'Nível de dificuldade'
                  },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Tags para categorização'
                  }
                }
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
                    tags: ['geografia', 'capitais', 'brasil']
                  }
                }
              }
            }
          }
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
                        dataCriacao: { type: 'string', format: 'date-time' }
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
    '/flashcards/progress': {
      get: {
        summary: 'Obter progresso dos flashcards',
        description: 'Retorna estatísticas de progresso dos flashcards do usuário',
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
            name: 'periodo',
            in: 'query',
            description: 'Período para análise',
            schema: { type: 'string', enum: ['dia', 'semana', 'mes', 'ano'], default: 'semana' }
          }
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
                              taxaAcerto: { type: 'number', example: 0.85 }
                            }
                          }
                        },
                        porDificuldade: {
                          type: 'object',
                          properties: {
                            facil: { type: 'integer', example: 30 },
                            medio: { type: 'integer', example: 60 },
                            dificil: { type: 'integer', example: 30 }
                          }
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
      },
      post: {
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
                    description: 'ID do flashcard'
                  },
                  acertou: {
                    type: 'boolean',
                    description: 'Se o usuário acertou ou não'
                  },
                  tempoResposta: {
                    type: 'integer',
                    description: 'Tempo de resposta em segundos'
                  },
                  dificuldade: {
                    type: 'string',
                    enum: ['facil', 'medio', 'dificil'],
                    description: 'Dificuldade percebida pelo usuário'
                  }
                }
              },
              examples: {
                progresso: {
                  summary: 'Exemplo de registro de progresso',
                  value: {
                    flashcardId: 'flashcard-123',
                    acertou: true,
                    tempoResposta: 5,
                    dificuldade: 'medio'
                  }
                }
              }
            }
          }
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
                    nivel: { type: 'integer', example: 4 }
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
          '404': {
            description: 'Flashcard não encontrado',
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
        description: 'Retorna lista de simulados disponíveis com filtros opcionais',
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
            description: 'Filtrar por nível de dificuldade',
            schema: { type: 'string', enum: ['basico', 'intermediario', 'avancado'] }
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filtrar por status',
            schema: { type: 'string', enum: ['disponivel', 'em_andamento', 'concluido'] }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Número máximo de resultados',
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 }
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Número de resultados para pular',
            schema: { type: 'integer', default: 0, minimum: 0 }
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
                          pontuacaoMaxima: { type: 'integer', example: 100 },
                          dataCriacao: { type: 'string', format: 'date-time' },
                          status: { type: 'string', example: 'disponivel' },
                          tentativas: { type: 'integer', example: 0 },
                          melhorPontuacao: { type: 'number', example: 0 }
                        }
                      }
                    },
                    paginacao: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 25 },
                        limit: { type: 'integer', example: 20 },
                        offset: { type: 'integer', example: 0 },
                        paginas: { type: 'integer', example: 2 }
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
      },
      post: {
        summary: 'Criar novo simulado',
        description: 'Cria um novo simulado no sistema',
        tags: ['Simulados'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['titulo', 'concurso', 'disciplina', 'questoes'],
                properties: {
                  titulo: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 200,
                    description: 'Título do simulado'
                  },
                  descricao: {
                    type: 'string',
                    maxLength: 1000,
                    description: 'Descrição do simulado'
                  },
                  concurso: {
                    type: 'string',
                    description: 'Concurso relacionado'
                  },
                  disciplina: {
                    type: 'string',
                    description: 'Disciplina do simulado'
                  },
                  nivel: {
                    type: 'string',
                    enum: ['basico', 'intermediario', 'avancado'],
                    default: 'intermediario',
                    description: 'Nível de dificuldade'
                  },
                  tempoLimite: {
                    type: 'integer',
                    minimum: 300,
                    maximum: 14400,
                    description: 'Tempo limite em segundos'
                  },
                  questoes: {
                    type: 'array',
                    minItems: 5,
                    maxItems: 200,
                    items: {
                      type: 'object',
                      required: ['enunciado', 'alternativas', 'respostaCorreta'],
                      properties: {
                        enunciado: { type: 'string', minLength: 10 },
                        alternativas: {
                          type: 'array',
                          minItems: 2,
                          maxItems: 5,
                          items: { type: 'string' }
                        },
                        respostaCorreta: { type: 'integer', minimum: 0 },
                        explicacao: { type: 'string' },
                        nivel: { type: 'string', enum: ['facil', 'medio', 'dificil'] }
                      }
                    }
                  }
                }
              },
              examples: {
                simulado: {
                  summary: 'Exemplo de criação de simulado',
                  value: {
                    titulo: 'Simulado OAB - Direito Constitucional',
                    descricao: 'Simulado completo de Direito Constitucional para OAB',
                    concurso: 'OAB',
                    disciplina: 'Direito Constitucional',
                    nivel: 'intermediario',
                    tempoLimite: 3600,
                    questoes: [
                      {
                        enunciado: 'Qual é o princípio fundamental da República Federativa do Brasil?',
                        alternativas: [
                          'A soberania',
                          'A cidadania',
                          'A dignidade da pessoa humana',
                          'O pluralismo político'
                        ],
                        respostaCorreta: 2,
                        explicacao: 'A dignidade da pessoa humana é o fundamento da República',
                        nivel: 'medio'
                      }
                    ]
                  }
                }
              }
            }
          }
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
                    message: { type: 'string', example: 'Simulado criado com sucesso' },
                    simulado: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: 'simulado-456' },
                        titulo: { type: 'string', example: 'Simulado OAB - Direito Constitucional' },
                        totalQuestoes: { type: 'integer', example: 1 },
                        dataCriacao: { type: 'string', format: 'date-time' }
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
    '/simulados/{id}': {
      get: {
        summary: 'Buscar simulado por ID',
        description: 'Retorna detalhes completos de um simulado específico',
        tags: ['Simulados'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID do simulado',
            schema: { type: 'string' }
          }
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
                    simulado: {
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
                        pontuacaoMaxima: { type: 'integer', example: 100 },
                        dataCriacao: { type: 'string', format: 'date-time' },
                        status: { type: 'string', example: 'disponivel' },
                        tentativas: { type: 'integer', example: 0 },
                        melhorPontuacao: { type: 'number', example: 0 },
                        questoes: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', example: 'questao-1' },
                              enunciado: { type: 'string', example: 'Qual é o princípio fundamental?' },
                              alternativas: { type: 'array', items: { type: 'string' } },
                              nivel: { type: 'string', example: 'medio' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Simulado não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/simulados/create': {
      post: {
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
                    description: 'Título do simulado'
                  },
                  descricao: {
                    type: 'string',
                    maxLength: 1000,
                    description: 'Descrição do simulado'
                  },
                  questoesIds: {
                    type: 'array',
                    minItems: 5,
                    maxItems: 200,
                    items: { type: 'string' },
                    description: 'IDs das questões selecionadas'
                  },
                  tempoLimite: {
                    type: 'integer',
                    minimum: 300,
                    maximum: 14400,
                    description: 'Tempo limite em segundos'
                  }
                }
              },
              examples: {
                personalizado: {
                  summary: 'Exemplo de simulado personalizado',
                  value: {
                    titulo: 'Meu Simulado Personalizado',
                    descricao: 'Simulado criado com questões selecionadas',
                    questoesIds: ['questao-1', 'questao-2', 'questao-3'],
                    tempoLimite: 1800
                  }
                }
              }
            }
          }
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
                    simulado: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/estatisticas': {
      get: {
        summary: 'Obter estatísticas gerais',
        description: 'Retorna estatísticas gerais do usuário',
        tags: ['Estatísticas'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'periodo',
            in: 'query',
            description: 'Período para análise',
            schema: { type: 'string', enum: ['dia', 'semana', 'mes', 'ano'], default: 'mes' }
          },
          {
            name: 'concurso',
            in: 'query',
            description: 'Filtrar por concurso',
            schema: { type: 'string' }
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
                              taxaAcerto: { type: 'number', example: 0.8 }
                            }
                          }
                        },
                        progresso: {
                          type: 'object',
                          properties: {
                            objetivo: { type: 'string', example: 'OAB' },
                            progresso: { type: 'number', example: 0.65 },
                            tempoRestante: { type: 'integer', example: 86400 }
                          }
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
    '/plano-estudos': {
      get: {
        summary: 'Listar planos de estudo',
        description: 'Retorna lista de planos de estudo do usuário',
        tags: ['Plano de Estudos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            description: 'Filtrar por status',
            schema: { type: 'string', enum: ['ativo', 'pausado', 'concluido'] }
          },
          {
            name: 'concurso',
            in: 'query',
            description: 'Filtrar por concurso',
            schema: { type: 'string' }
          }
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
                                progresso: { type: 'number', example: 0.8 }
                              }
                            }
                          }
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
      },
      post: {
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
                    description: 'Título do plano'
                  },
                  objetivo: {
                    type: 'string',
                    minLength: 10,
                    maxLength: 500,
                    description: 'Objetivo do plano'
                  },
                  dataInicio: {
                    type: 'string',
                    format: 'date',
                    description: 'Data de início'
                  },
                  dataFim: {
                    type: 'string',
                    format: 'date',
                    description: 'Data de término'
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
                        prioridade: { type: 'string', enum: ['baixa', 'media', 'alta'], default: 'media' }
                      }
                    }
                  },
                  metaDiaria: {
                    type: 'integer',
                    minimum: 900,
                    maximum: 28800,
                    description: 'Meta de estudo diário em segundos'
                  },
                  diasEstudo: {
                    type: 'array',
                    items: { type: 'integer', minimum: 0, maximum: 6 },
                    description: 'Dias da semana para estudo (0=domingo, 6=sábado)'
                  }
                }
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
                        prioridade: 'alta'
                      },
                      {
                        disciplina: 'Direito Administrativo',
                        tempoAlocado: 2700,
                        prioridade: 'media'
                      }
                    ],
                    metaDiaria: 7200,
                    diasEstudo: [1, 2, 3, 4, 5, 6]
                  }
                }
              }
            }
          }
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
                        dataCriacao: { type: 'string', format: 'date-time' }
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
    '/plano-estudos/{id}': {
      get: {
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
            schema: { type: 'string' }
          }
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
                              tempoEstudado: { type: 'integer', example: 2880 }
                            }
                          }
                        },
                        atividades: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              data: { type: 'string', format: 'date' },
                              tempoEstudado: { type: 'integer', example: 7200 },
                              disciplinas: { type: 'array', items: { type: 'string' } }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Plano de estudo não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      put: {
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
            schema: { type: 'string' }
          }
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
                        prioridade: { type: 'string', enum: ['baixa', 'media', 'alta'] }
                      }
                    }
                  },
                  metaDiaria: { type: 'integer', minimum: 900, maximum: 28800 },
                  diasEstudo: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 6 } }
                }
              }
            }
          }
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
                    plano: { type: 'object' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Plano de estudo não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      delete: {
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
            schema: { type: 'string' }
          }
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
                    message: { type: 'string', example: 'Plano de estudo excluído com sucesso' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Plano de estudo não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/questoes-semanais': {
      get: {
        summary: 'Listar questões semanais',
        description: 'Retorna lista de questões semanais disponíveis',
        tags: ['Questões Semanais'],
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
            name: 'semana',
            in: 'query',
            description: 'Número da semana',
            schema: { type: 'integer', minimum: 1, maximum: 52 }
          },
          {
            name: 'ano',
            in: 'query',
            description: 'Ano de referência',
            schema: { type: 'integer', minimum: 2020 }
          }
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
                          descricao: { type: 'string', example: 'Questão de Direito Constitucional' },
                          concurso: { type: 'string', example: 'OAB' },
                          disciplina: { type: 'string', example: 'Direito Constitucional' },
                          semana: { type: 'integer', example: 15 },
                          ano: { type: 'integer', example: 2024 },
                          dataPublicacao: { type: 'string', format: 'date' },
                          status: { type: 'string', example: 'disponivel' },
                          tentativas: { type: 'integer', example: 0 },
                          acertos: { type: 'integer', example: 0 }
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
      },
      post: {
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
                    description: 'Título da questão'
                  },
                  descricao: {
                    type: 'string',
                    maxLength: 500,
                    description: 'Descrição da questão'
                  },
                  concurso: {
                    type: 'string',
                    description: 'Concurso relacionado'
                  },
                  disciplina: {
                    type: 'string',
                    description: 'Disciplina da questão'
                  },
                  semana: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 52,
                    description: 'Número da semana'
                  },
                  ano: {
                    type: 'integer',
                    minimum: 2020,
                    description: 'Ano de referência'
                  },
                  enunciado: {
                    type: 'string',
                    minLength: 10,
                    description: 'Enunciado da questão'
                  },
                  alternativas: {
                    type: 'array',
                    minItems: 2,
                    maxItems: 5,
                    items: { type: 'string' },
                    description: 'Alternativas da questão'
                  },
                  respostaCorreta: {
                    type: 'integer',
                    minimum: 0,
                    description: 'Índice da resposta correta'
                  },
                  explicacao: {
                    type: 'string',
                    description: 'Explicação da resposta'
                  },
                  nivel: {
                    type: 'string',
                    enum: ['facil', 'medio', 'dificil'],
                    default: 'medio',
                    description: 'Nível de dificuldade'
                  }
                }
              },
              examples: {
                questao: {
                  summary: 'Exemplo de questão semanal',
                  value: {
                    titulo: 'Questão Semanal #15 - Direito Constitucional',
                    descricao: 'Questão sobre princípios fundamentais',
                    concurso: 'OAB',
                    disciplina: 'Direito Constitucional',
                    semana: 15,
                    ano: 2024,
                    enunciado: 'Qual é o princípio fundamental da República Federativa do Brasil?',
                    alternativas: [
                      'A soberania',
                      'A cidadania',
                      'A dignidade da pessoa humana',
                      'O pluralismo político'
                    ],
                    respostaCorreta: 2,
                    explicacao: 'A dignidade da pessoa humana é o fundamento da República',
                    nivel: 'medio'
                  }
                }
              }
            }
          }
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
                        dataCriacao: { type: 'string', format: 'date-time' }
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
    '/mapa-assuntos': {
      get: {
        summary: 'Listar mapa de assuntos',
        description: 'Retorna o mapa de assuntos organizados por disciplina',
        tags: ['Mapa de Assuntos'],
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
            description: 'Filtrar por disciplina específica',
            schema: { type: 'string' }
          }
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
                                descricao: { type: 'string', example: 'Fundamentos da República' },
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
                                      progresso: { type: 'number', example: 1.0 }
                                    }
                                  }
                                }
                              }
                            }
                          }
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
    '/mapa-assuntos/{id}': {
      get: {
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
            schema: { type: 'string' }
          }
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
                        descricao: { type: 'string', example: 'Fundamentos da República' },
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
                              acertos: { type: 'integer', example: 4 }
                            }
                          }
                        },
                        recursos: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              tipo: { type: 'string', example: 'apostila' },
                              titulo: { type: 'string', example: 'Apostila de Direito Constitucional' },
                              url: { type: 'string', example: '/apostilas/direito-constitucional' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Assunto não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      put: {
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
            schema: { type: 'string' }
          }
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
                    description: 'Novo status do assunto'
                  },
                  progresso: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                    description: 'Progresso do estudo (0-1)'
                  },
                  tempoEstudo: {
                    type: 'integer',
                    minimum: 0,
                    description: 'Tempo adicional de estudo em segundos'
                  }
                }
              },
              examples: {
                atualizacao: {
                  summary: 'Exemplo de atualização de status',
                  value: {
                    status: 'estudado',
                    progresso: 1.0,
                    tempoEstudo: 1800
                  }
                }
              }
            }
          }
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
                    assunto: { type: 'object' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Assunto não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/dashboard': {
      get: {
        summary: 'Obter dados do dashboard',
        description: 'Retorna dados consolidados para o dashboard do usuário',
        tags: ['Dashboard'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'periodo',
            in: 'query',
            description: 'Período para análise',
            schema: { type: 'string', enum: ['hoje', 'semana', 'mes'], default: 'semana' }
          }
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
                            ranking: { type: 'integer', example: 15 }
                          }
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
                              disciplinas: { type: 'array', items: { type: 'string' } }
                            }
                          }
                        },
                        proximasAtividades: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              tipo: { type: 'string', example: 'simulado' },
                              titulo: { type: 'string', example: 'Simulado OAB' },
                              data: { type: 'string', format: 'date' },
                              prioridade: { type: 'string', example: 'alta' }
                            }
                          }
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
                              tempoEstudo: { type: 'integer', example: 14400 }
                            }
                          }
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
    '/admin/clear-cache': {
      post: {
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
                    description: 'Tipo de cache a ser limpo'
                  }
                }
              },
              examples: {
                limpeza: {
                  summary: 'Exemplo de limpeza de cache',
                  value: {
                    tipo: 'todos'
                  }
                }
              }
            }
          }
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
                        tempoExecucao: { type: 'number', example: 0.5 }
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
          },
          '403': {
            description: 'Acesso negado - requer privilégios de administrador',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/admin/database-usage': {
      get: {
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
                              tamanho: { type: 'string', example: '500 MB' }
                            }
                          }
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
          },
          '403': {
            description: 'Acesso negado - requer privilégios de administrador',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/admin/validate-schema': {
      post: {
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
                        avisos: { type: 'array', items: { type: 'string' } }
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
          },
          '403': {
            description: 'Acesso negado - requer privilégios de administrador',
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
    },
    {
      name: 'Questões Semanais',
      description: 'Endpoints relacionados ao gerenciamento de questões semanais'
    },
    {
      name: 'Mapa de Assuntos',
      description: 'Endpoints relacionados ao mapa de assuntos e progresso'
    },
    {
      name: 'Dashboard',
      description: 'Endpoints relacionados ao dashboard do usuário'
    },
    {
      name: 'Admin',
      description: 'Endpoints administrativos para gerenciamento do sistema'
    }
  ]
};

export function generateOpenAPISpec(): OpenAPIV3.Document {
  return openApiConfig;
}

export default openApiConfig; 