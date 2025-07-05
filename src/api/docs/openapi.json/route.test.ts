import { describe, it, expect } from 'vitest';
import { serveOpenAPISpec } from '../../../core/documentation/swagger-ui';

describe('OpenAPI Endpoints', () => {
  describe('serveOpenAPISpec', () => {
    it('should return OpenAPI specification as JSON', async () => {
      const response = serveOpenAPISpec();
      
      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      
      const spec = await response.json();
      expect(spec).toHaveProperty('openapi', '3.0.0');
      expect(spec).toHaveProperty('info.title', 'AprovaFacil API');
      expect(spec).toHaveProperty('paths');
      expect(spec).toHaveProperty('components');
    });
  });
}); 