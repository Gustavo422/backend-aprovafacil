import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';

// Mocks necessários ANTES de importar os controllers

// Mock do CacheManager (no-op, executa factory sempre)
vi.mock('../../../core/utils/cache-manager.js', () => {
  class CacheManagerMock {
    static getInstance() { return new CacheManagerMock(); }
    async get() { return null; }
    async getOrSet(_key: string, factory: () => Promise<unknown>) { return factory(); }
    getCacheService() { return {}; }
  }
  return { CacheManager: CacheManagerMock, default: CacheManagerMock };
});

// Mock do LogService (não grava em banco)
vi.mock('../../../core/utils/log.service.js', () => {
  class LogServiceMock {
    info() { return Promise.resolve(); }
    erro() { return Promise.resolve(); }
    aviso() { return Promise.resolve(); }
    debug() { return Promise.resolve(); }
    logarPerformance() { return Promise.resolve(); }
  }
  return { LogService: LogServiceMock };
});

// Mock do repositório para retornar dados determinísticos (stub do Supabase por meio do repo)
vi.mock('../repositories/dashboard.repository.js', () => {
  class RepoMock {
    async fetchSimulados(_usuarioId: string) {
      return [
        { id: '1', concluido_em: new Date().toISOString(), tempo_gasto_minutos: 30, pontuacao: 70 },
        { id: '2', concluido_em: new Date(Date.now() - 86_400_000).toISOString(), tempo_gasto_minutos: 45, pontuacao: 80 },
      ];
    }
    async fetchQuestoesSemanais(_usuarioId: string) {
      return [
        { id: 'q1', correta: true, criado_em: new Date().toISOString() },
        { id: 'q2', correta: false, criado_em: new Date().toISOString() },
      ];
    }
    async fetchFlashcards(_usuarioId: string) {
      return [
        { id: 'f1', status: 'dominado', atualizado_em: new Date().toISOString() },
        { id: 'f2', status: 'aprendendo', atualizado_em: new Date().toISOString() },
      ];
    }
    async fetchSimuladoActivities(_usuarioId: string) {
      return [
        { id: '1', concluido_em: new Date(Date.now() - 60_000).toISOString(), tempo_gasto_minutos: 30, pontuacao: 70, simulados: { titulo: 'S1', dificuldade: 'Médio' } },
        { id: '2', concluido_em: new Date().toISOString(), tempo_gasto_minutos: 40, pontuacao: 78, simulados: { titulo: 'S2', dificuldade: 'Difícil' } },
      ];
    }
    async fetchFlashcardActivities(_usuarioId: string) {
      return [
        { id: '10', criado_em: new Date().toISOString(), status: 'revisado', atualizado_em: new Date().toISOString(), cartoes_memorizacao: { frente: 'A', disciplina: 'Português' } },
      ];
    }
    async fetchApostilaActivities(_usuarioId: string) {
      return [
        { id: '20', criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString(), percentual_progresso: 50, conteudo_apostila: { titulo: 'Apostila 1' } },
      ];
    }
  }
  return { AlunoDashboardRepository: RepoMock };
});

// Importar controllers reais após mocks
const controllersPromise = import('../controllers/dashboard.controller.js');

// App de teste
let server: import('http').Server;
let baseUrl: string;

function requireAuthStub(req: Request, _res: Response, next: NextFunction) {
  (req as any).user = { id: 'user-1', email: 'u@e.com', role: 'user', nome: 'User' };
  next();
}

beforeAll(async () => {
  const { getEnhancedStats, getActivities } = await controllersPromise;
  const app = express();
  app.use(express.json());

  app.get('/api/guru/v1/dashboard/enhanced-stats', requireAuthStub, (req, res) => { void getEnhancedStats(req, res); });
  app.get('/api/guru/v1/dashboard/activities', requireAuthStub, (req, res) => { void getActivities(req, res); });

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (typeof address === 'object' && address && 'port' in address) {
    baseUrl = `http://127.0.0.1:${address.port}`;
  } else {
    throw new Error('Falha ao iniciar servidor de teste');
  }
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
});

describe('Guru routes integration (controller → service → repo)', () => {
  it('GET /api/guru/v1/dashboard/enhanced-stats deve responder com sucesso e dados', async () => {
    const res = await fetch(`${baseUrl}/api/guru/v1/dashboard/enhanced-stats`, {
      headers: { 'x-correlation-id': 'test-corr-id', 'authorization': 'Bearer test' },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeTruthy();
    expect(typeof json.data.totalSimulados).toBe('number');
  });

  it('GET /api/guru/v1/dashboard/activities deve responder com lista', async () => {
    const res = await fetch(`${baseUrl}/api/guru/v1/dashboard/activities?limit=5`, {
      headers: { 'x-correlation-id': 'test-corr-id', 'authorization': 'Bearer test' },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
  });
});


