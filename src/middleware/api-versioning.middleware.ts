import type { NextFunction, Request, Response } from 'express';

// Configuração básica de versionamento SemVer por major
const DEFAULT_MAJOR = '1';
const SUNSET_DATE = '2025-12-31'; // Data de descontinuação dos endpoints não versionados (janela de depreciação)

function isVersionedPath(pathname: string): boolean {
  return /^\/api\/v\d+\//.test(pathname);
}

function computeVersionedUrl(originalUrl: string, major = DEFAULT_MAJOR): string {
  return originalUrl.replace(/^\/api\//, `/api/v${major}/`);
}

export function apiVersionRewriteMiddleware(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (!req.url.startsWith('/api/')) {
      next();
      return;
    }
    if (isVersionedPath(req.url)) {
      next();
      return;
    }

    const acceptVersion = req.get('Accept-Version');
    if (acceptVersion) {
      // Suporta formatos simples "1", "1.x", "^1", "~1" — tudo mapeado para major
      const majorMatch = /^(\d+)/.exec(acceptVersion.trim());
      const major = majorMatch?.[1] ?? DEFAULT_MAJOR;
      req.url = computeVersionedUrl(req.url, major);
    }
    next();
  } catch (_err) {
    next();
  }
}

export function apiDeprecationHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.url.startsWith('/api/') && !isVersionedPath(req.url)) {
    const successor = computeVersionedUrl(req.originalUrl);
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', SUNSET_DATE);
    // RFC 8288 Link header com rel successor-version apontando para v1 equivalente
    res.setHeader('Link', `<${successor}>; rel="successor-version"`);
  }
  next();
}



