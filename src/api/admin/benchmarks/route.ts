import { Router, Request, Response } from 'express';
import { requireAuth } from '../../../middleware/auth.js';
import { execFile } from 'child_process';
import path from 'path';
import { URL } from 'url';

const router = Router();

// Mock: Armazenamento em memória (substituir por banco depois)
const benchmarkResults: unknown[] = [];

// POST /api/admin/benchmarks - Salvar resultado de benchmark
router.post('/', requireAuth, (req: Request, res: Response) => {
  const result = req.body;
  result.timestamp = new Date().toISOString();
  benchmarkResults.push(result);
  res.json({ success: true, message: 'Resultado de benchmark salvo', result });
});

// GET /api/admin/benchmarks - Listar resultados
router.get('/', requireAuth, (req: Request, res: Response) => {
  res.json({ success: true, results: benchmarkResults });
});

// POST /api/admin/benchmarks/run - Executa benchmarks e retorna resultado
router.post('/run', requireAuth, async (req: Request, res: Response) => {
  try {
    const scripts = [
      path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../scripts/benchmarks/select-simple.cjs'),
      path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../scripts/benchmarks/select-complex.cjs'),
    ];
    const results = [];
    for (const script of scripts) {
      const output = await new Promise((resolve, reject) => {
        execFile('node', [script], { env: process.env }, (error, stdout, stderr) => {
          if (error) return reject(stderr || error.message);
          // Tentar extrair JSON do stdout
          try {
            // Procurar por JSON no stdout
            const match = stdout.match(/\{[\s\S]*\}/);
            if (match) {
              resolve(JSON.parse(match[0]));
            } else {
              resolve({ raw: stdout });
            }
          } catch {
            resolve({ raw: stdout });
          }
        });
      });
      results.push(output);
      // Salvar no mock storage
      if (output && typeof output === 'object' && !Array.isArray(output)) {
        benchmarkResults.push({ ...output, timestamp: new Date().toISOString() });
      } else {
        benchmarkResults.push({ raw: output, timestamp: new Date().toISOString() });
      }
    }
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.toString() });
  }
});

export default router; 