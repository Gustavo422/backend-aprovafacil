import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { needsConcursoFilter, resolveRequestPath } from './global-concurso-filter.middleware.js';

describe('global-concurso-filter.middleware helpers', () => {
  describe('resolveRequestPath', () => {
    it('usa originalUrl quando disponível', () => {
      const req = { originalUrl: '/api/v1/simulados?x=1', baseUrl: '/api', path: '/v1/simulados' } as unknown as Request;
      expect(resolveRequestPath(req)).toBe('/api/v1/simulados');
    });

    it('fallback para baseUrl+path quando originalUrl ausente', () => {
      const req = { baseUrl: '/api', path: '/simulados' } as unknown as Request;
      expect(resolveRequestPath(req)).toBe('/api/simulados');
    });

    it('retorna path quando baseUrl ausente', () => {
      const req = { path: '/simulados' } as unknown as Request;
      expect(resolveRequestPath(req)).toBe('/simulados');
    });
  });

  describe('needsConcursoFilter', () => {
    it('reconhece rotas em /api/simulados', () => {
      expect(needsConcursoFilter('/api/simulados')).toBe(true);
      expect(needsConcursoFilter('/api/simulados/123')).toBe(true);
    });

    it('reconhece rotas em /api/v1/simulados', () => {
      expect(needsConcursoFilter('/api/v1/simulados')).toBe(true);
      expect(needsConcursoFilter('/api/v1/simulados/slug/abc')).toBe(true);
    });

    it('ignora outras rotas', () => {
      expect(needsConcursoFilter('/api/health')).toBe(false);
      expect(needsConcursoFilter('/auth/login')).toBe(false);
    });
  });
});