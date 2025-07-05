import { describe, it, expect } from 'vitest';
import { generateOpenAPISpec } from '../src/core/documentation/openapi';

describe('Documentação OpenAPI', () => {
  it('deve gerar especificação OpenAPI válida', () => {
    const spec = generateOpenAPISpec();
    
    // Verificar estrutura básica
    expect(spec).toBeDefined();
    expect(spec.openapi).toBe('3.0.0');
    expect(spec.info).toBeDefined();
    expect(spec.info.title).toBe('AprovaFácil API');
    expect(spec.info.version).toBe('1.0.0');
    
    // Verificar paths
    expect(spec.paths).toBeDefined();
    expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
    
    // Verificar componentes
    expect(spec.components).toBeDefined();
    expect(spec.components.schemas).toBeDefined();
    expect(spec.components.securitySchemes).toBeDefined();
    
    // Verificar tags
    expect(spec.tags).toBeDefined();
    expect(spec.tags.length).toBeGreaterThan(0);
  });

  it('deve incluir todos os endpoints principais', () => {
    const spec = generateOpenAPISpec();
    const paths = Object.keys(spec.paths);
    
    // Verificar endpoints de autenticação
    expect(paths).toContain('/auth/login');
    expect(paths).toContain('/auth/register');
    expect(paths).toContain('/auth/forgot-password');
    expect(paths).toContain('/auth/reset-password');
    expect(paths).toContain('/auth/verify-reset-token');
    
    // Verificar endpoints de conteúdo
    expect(paths).toContain('/apostilas');
    expect(paths).toContain('/flashcards');
    expect(paths).toContain('/simulados');
    expect(paths).toContain('/estatisticas');
    expect(paths).toContain('/plano-estudos');
    expect(paths).toContain('/questoes-semanais');
    expect(paths).toContain('/mapa-assuntos');
    expect(paths).toContain('/dashboard');
    
    // Verificar endpoints admin
    expect(paths).toContain('/admin/clear-cache');
    expect(paths).toContain('/admin/database-usage');
    expect(paths).toContain('/admin/validate-schema');
  });

  it('deve incluir schemas de erro', () => {
    const spec = generateOpenAPISpec();
    
    expect(spec.components.schemas.Error).toBeDefined();
    expect(spec.components.schemas.Error.type).toBe('object');
    expect(spec.components.schemas.Error.properties).toBeDefined();
    expect(spec.components.schemas.Error.properties.success).toBeDefined();
    expect(spec.components.schemas.Error.properties.message).toBeDefined();
  });

  it('deve incluir esquemas de segurança', () => {
    const spec = generateOpenAPISpec();
    
    expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
    expect(spec.components.securitySchemes.bearerAuth.type).toBe('http');
    expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
  });

  it('deve ter tags organizadas', () => {
    const spec = generateOpenAPISpec();
    
    const tagNames = spec.tags.map(tag => tag.name);
    
    expect(tagNames).toContain('Autenticação');
    expect(tagNames).toContain('Apostilas');
    expect(tagNames).toContain('Flashcards');
    expect(tagNames).toContain('Simulados');
    expect(tagNames).toContain('Estatísticas');
    expect(tagNames).toContain('Plano de Estudos');
    expect(tagNames).toContain('Questões Semanais');
    expect(tagNames).toContain('Mapa de Assuntos');
    expect(tagNames).toContain('Dashboard');
    expect(tagNames).toContain('Admin');
  });

  it('deve ter exemplos válidos nos endpoints', () => {
    const spec = generateOpenAPISpec();
    
    // Verificar se o endpoint de login tem exemplos
    const loginPath = spec.paths['/auth/login'];
    expect(loginPath).toBeDefined();
    expect(loginPath.post).toBeDefined();
    expect(loginPath.post.requestBody).toBeDefined();
    expect(loginPath.post.requestBody.content['application/json'].examples).toBeDefined();
  });

  it('deve ter respostas de erro padronizadas', () => {
    const spec = generateOpenAPISpec();
    
    // Verificar se endpoints autenticados têm resposta 401
    const simuladosPath = spec.paths['/simulados'];
    expect(simuladosPath.get.responses['401']).toBeDefined();
    expect(simuladosPath.get.responses['401'].description).toBe('Não autorizado');
  });

  it('deve ter parâmetros de query bem definidos', () => {
    const spec = generateOpenAPISpec();
    
    // Verificar parâmetros de filtro
    const simuladosPath = spec.paths['/simulados'];
    const parameters = simuladosPath.get.parameters;
    
    expect(parameters).toBeDefined();
    expect(parameters.length).toBeGreaterThan(0);
    
    const concursoParam = parameters.find(p => p.name === 'concurso');
    expect(concursoParam).toBeDefined();
    expect(concursoParam.in).toBe('query');
    expect(concursoParam.schema.type).toBe('string');
  });

  it('deve ter validações de request body', () => {
    const spec = generateOpenAPISpec();
    
    // Verificar validações no endpoint de registro
    const registerPath = spec.paths['/auth/register'];
    const requestBody = registerPath.post.requestBody;
    
    expect(requestBody.required).toBe(true);
    expect(requestBody.content['application/json'].schema.required).toBeDefined();
    expect(requestBody.content['application/json'].schema.required).toContain('email');
    expect(requestBody.content['application/json'].schema.required).toContain('password');
  });
}); 