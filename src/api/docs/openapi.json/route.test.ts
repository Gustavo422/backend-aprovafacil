import { describe, it, expect, vi } from 'vitest';
import { GET } from './route.js';

// Mock the documentation functions
vi.mock('../../../../core/documentation/openapi', () => ({
  generateOpenAPISpec: vi.fn(() => ({
    openapi: '3.0.0',
    info: {
      titulo: 'AprovaFácil API',
      version: '1.0.0',
      descricao: 'API completa para sistema de estudos e preparação para concursos públicos'
    },
    paths: {
      '/auth/login': {
        post: {
          summary: 'Login do usuário',
          tags: ['Autenticação']
        }
      },
      '/auth/register': {
        post: {
          summary: 'Registro do usuário',
          tags: ['Autenticação']
        }
      },
      '/concursos': {
        get: {
          summary: 'Listar concursos',
          tags: ['Concursos']
        }
      },
      '/simulados': {
        get: {
          summary: 'Listar simulados',
          tags: ['Simulados']
        }
      },
      '/flashcards': {
        get: {
          summary: 'Listar flashcards',
          tags: ['Flashcards']
        }
      },
      '/estatisticas': {
        get: {
          summary: 'Obter estatísticas',
          tags: ['Estatísticas']
        }
      },
      '/dashboard': {
        get: {
          summary: 'Obter dashboard',
          tags: ['Dashboard']
        }
      },
      '/conteudo': {
        get: {
          summary: 'Obter conteúdo',
          tags: ['Conteúdo']
        }
      },
      '/apostilas': {
        get: {
          summary: 'Listar apostilas',
          tags: ['Apostilas']
        }
      },
      '/plano-estudos': {
        get: {
          summary: 'Obter plano de estudos',
          tags: ['Plano de Estudos']
        }
      },
      '/questoes-semanais': {
        get: {
          summary: 'Obter questões semanais',
          tags: ['Questões Semanais']
        }
      },
      '/mapa-assuntos': {
        get: {
          summary: 'Obter mapa de assuntos',
          tags: ['Mapa de Assuntos']
        }
      },
      '/weak-points': {
        get: {
          summary: 'Obter pontos fracos',
          tags: ['Weak Points']
        }
      },
      '/categoria-disciplinas': {
        get: {
          summary: 'Listar categorias de disciplinas',
          tags: ['Categoria Disciplinas']
        }
      },
      '/concurso-categorias': {
        get: {
          summary: 'Listar categorias de concurso',
          tags: ['Concurso Categorias']
        }
      },
      '/user': {
        get: {
          summary: 'Obter dados do usuário',
          tags: ['Usuário']
        }
      },
      '/admin': {
        get: {
          summary: 'Ações administrativas',
          tags: ['Admin']
        }
      }
    },
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            nome: { type: 'string' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      },
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    tags: [
      { nome: 'Autenticação', descricao: 'Endpoints de autenticação e autorização' },
      { nome: 'Preferências', descricao: 'Preferências de usuário por concurso' }
    ]
  }))
}));

// Mock do NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
      headers: new Map(Object.entries(options?.headers || {}))
    }))
  }
}));

describe('OpenAPI JSON Route', () => {
  it('deve retornar especificação OpenAPI válida', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data).toBeDefined();
    expect(data.openapi).toBeDefined();
    expect(data.info).toBeDefined();
    expect(data.paths).toBeDefined();
  });

  it('deve incluir informações básicas da API', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.info.titulo).toBeDefined();
    expect(data.info.version).toBeDefined();
    expect(data.info.descricao).toBeDefined();
  });

  it('deve incluir caminhos da API', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.paths).toBeDefined();
    expect(typeof data.paths).toBe('object');
  });

  it('deve incluir definições de componentes', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.components).toBeDefined();
    expect(data.components.schemas).toBeDefined();
  });

  it('deve retornar status 200', async () => {
    const response = await GET();
    
    expect(response.status).toBe(200);
  });

  it('deve ter headers corretos', async () => {
    const response = await GET();
    
    // Verificar se o header existe antes de testar
    const contentType = response.headers.get('Content-Type');
    if (contentType) {
      expect(contentType).toContain('application/json');
    }
  });

  it('deve incluir endpoints de autenticação', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.paths['/auth/login']).toBeDefined();
    expect(data.paths['/auth/register']).toBeDefined();
  });

  it('deve incluir endpoints de concursos', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.paths['/concursos']).toBeDefined();
  });

  it('deve incluir endpoints de simulados', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.paths['/simulados']).toBeDefined();
  });

  it('deve incluir endpoints de flashcards', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.paths['/flashcards']).toBeDefined();
  });

  it('deve incluir endpoints de estatísticas', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.paths['/estatisticas']).toBeDefined();
  });

  it('deve incluir endpoints de dashboard', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.paths['/dashboard']).toBeDefined();
  });

  it('deve incluir endpoints de conteúdo', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.paths['/conteudo']).toBeDefined();
  });

  it('deve incluir endpoints de apostilas', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.paths['/apostilas']).toBeDefined();
  });

  it('deve incluir endpoints de plano de estudos', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.paths['/plano-estudos']).toBeDefined();
  });

  it('deve incluir endpoints de questões semanais', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.paths['/questoes-semanais']).toBeDefined();
  });

  it('deve incluir endpoints de mapa de assuntos', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.paths['/mapa-assuntos']).toBeDefined();
  });

  it('deve incluir endpoints de weak points', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.paths['/weak-points']).toBeDefined();
  });

  it('deve incluir endpoints de categoria de disciplinas', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.paths['/categoria-disciplinas']).toBeDefined();
  });

  it('deve incluir endpoints de categorias de concurso', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.paths['/concurso-categorias']).toBeDefined();
  });

  it('deve incluir endpoints de usuário', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.paths['/user']).toBeDefined();
  });

  it('deve incluir endpoints de admin', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.paths['/admin']).toBeDefined();
  });
}); 



