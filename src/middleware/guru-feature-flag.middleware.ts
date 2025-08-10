import type { Request, Response, NextFunction } from 'express';
import { isGuruNewModuleEnabled, isGuruNewModuleFullyEnabled, isRequestInGuruCanarySegment } from '../config/feature-flags.js';

/**
 * Middleware que decide o target de rota para o módulo Guru (legacy vs novo módulo)
 * - Quando totalmente ON: sempre novo módulo
 * - Quando OFF: sempre legacy
 * - Quando CANARY: direciona parte do tráfego com base em userId (ou IP)
 *
 * Define `req.guruRouteTarget = 'new' | 'legacy'` para consumidores usarem
 */
export function guruFeatureFlagMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // @ts-expect-error attach custom property
  if (!isGuruNewModuleEnabled()) { req.guruRouteTarget = 'legacy'; next(); return; }
  // @ts-expect-error attach custom property
  if (isGuruNewModuleFullyEnabled()) { req.guruRouteTarget = 'new'; next(); return; }

  // CANARY: calcular com base em um ID estável de usuário (se autenticado) ou IP
  const userId = (req as unknown as { user?: { id?: string } }).user?.id;
  const ip = req.ip ?? req.connection.remoteAddress ?? '';
  const stableId = userId || ip;
  // @ts-expect-error attach custom property
  req.guruRouteTarget = isRequestInGuruCanarySegment(stableId) ? 'new' : 'legacy';
  next();
}

export type GuruRouteTarget = 'new' | 'legacy';


