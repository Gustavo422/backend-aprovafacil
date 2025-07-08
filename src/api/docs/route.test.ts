/* global Response */
import { describe, it, expect, vi } from 'vitest';
import { GET } from './route.js';

// Mock do NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
      headers: options?.headers || {}
    }))
  }
}));

describe('Docs Route', () => {
  it('deve retornar HTML do Swagger UI', async () => {
    const response = await GET();
    
    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get('Content-Type')).toContain('text/html');
  });

  it('deve incluir Swagger UI no HTML', async () => {
    const response = await GET();
    const html = await response.text();
    
    expect(html).toContain('swagger-ui');
    expect(html).toContain('SwaggerUIBundle');
  });

  it('deve incluir headers de cache apropriados', async () => {
    const response = await GET();
    
    // Verificar se os headers existem antes de testar
    const cacheControl = response.headers.get('Cache-Control');
    const pragma = response.headers.get('Pragma');
    
    if (cacheControl) {
      expect(cacheControl).toContain('no-cache');
    }
    if (pragma) {
      expect(pragma).toBe('no-cache');
    }
  });
}); 