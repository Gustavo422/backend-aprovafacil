import type { NextFunction, Request, Response } from 'express';

interface UserRateLimitOptions {
  windowMs?: number;
  max?: number;
}

type Key = string;

const defaultOptions: Required<UserRateLimitOptions> = {
  windowMs: 60_000, // 1 minuto
  max: 60, // 60 requisições/minuto por usuário
};

export function createUserRateLimitMiddleware(options?: UserRateLimitOptions) {
  const opts = { ...defaultOptions, ...(options ?? {}) };
  const bucket: Map<Key, { count: number; resetAt: number }> = new Map();

  function consume(key: Key): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = bucket.get(key);
    if (!entry || entry.resetAt <= now) {
      const next = { count: 1, resetAt: now + opts.windowMs };
      bucket.set(key, next);
      return { allowed: true, remaining: opts.max - 1, resetAt: next.resetAt };
    }
    entry.count += 1;
    const allowed = entry.count <= opts.max;
    return { allowed, remaining: Math.max(0, opts.max - entry.count), resetAt: entry.resetAt };
  }

  // Limpeza periódica
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of bucket.entries()) {
      if (v.resetAt <= now) bucket.delete(k);
    }
  }, opts.windowMs).unref?.();

  return function userRateLimit(req: Request, res: Response, next: NextFunction): void {
    try {
      const userId = (req as any).user?.id as string | undefined;
      const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
      const key = userId ? `user:${userId}` : `ip:${ip}`;
      const { allowed, remaining, resetAt } = consume(key);

      res.setHeader('X-RateLimit-Limit', String(opts.max));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

      if (!allowed) {
        res.status(429).json({
          success: false,
          error: 'Muitas requisições para este usuário. Tente novamente em instantes.',
          code: 'USER_RATE_LIMIT_EXCEEDED',
        });
        return;
      }
      next();
    } catch {
      next();
    }
  };
}


