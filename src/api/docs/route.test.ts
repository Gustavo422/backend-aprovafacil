import { describe, it, expect } from 'vitest';
import { serveSwaggerUI } from '../../core/documentation/swagger-ui';

describe('Documentation Endpoints', () => {
  describe('serveSwaggerUI', () => {
    it('should return HTML with Swagger UI', async () => {
      const mockRequest = {} as any;
      const response = serveSwaggerUI(mockRequest);
      
      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get('Content-Type')).toBe('text/html');
      
      // Verificar se o HTML contém elementos do Swagger UI
      const html = await response.text();
      expect(html).toContain('swagger-ui');
      expect(html).toContain('SwaggerUIBundle');
      expect(html).toContain('/api/docs/openapi.json');
    });
  });
}); 