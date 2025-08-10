import type { Request, Response } from 'express';

export const GET = (req: Request, res: Response) => {
  try {
    // Preferir arquivo estático exportado caso exista
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { existsSync } = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { join } = require('path');
    const staticPath = join(__dirname, '..', '..', 'openapi.json');
    if (existsSync(staticPath)) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const staticSpec = require(staticPath);
      return res.json(staticSpec);
    }

    // Fallback: carregar do build
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const mod = require('../../dist/src/core/documentation/openapi.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const generateOpenAPISpec = (mod && mod.generateOpenAPISpec) as (() => unknown) | undefined;

    if (typeof generateOpenAPISpec !== 'function') {
      return res.status(503).json({
        success: false,
        error: 'Documentação indisponível. Rode "npm run build" ou "npm run openapi:export".',
      });
    }

    const spec = generateOpenAPISpec();
    return res.json(spec);
  } catch (error) {
    console.error('Erro ao gerar documentação OpenAPI:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};



