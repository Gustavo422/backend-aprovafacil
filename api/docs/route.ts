import type { Request, Response } from 'express';
// import { generateOpenAPISpec } from '../../src/core/documentation/openapi';

export const GET = (req: Request, res: Response) => {
  try {
    // Tentar carregar dinamicamente do build para evitar typecheck do arquivo TS gigante
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const mod = require('../../dist/src/core/documentation/openapi.js');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const generateOpenAPISpec = (mod && mod.generateOpenAPISpec) as (() => unknown) | undefined;

    if (typeof generateOpenAPISpec !== 'function') {
      return res.status(503).json({
        success: false,
        error: 'Documentação indisponível em modo dev sem build. Rode "npm run build" para gerar a documentação.',
      });
    }

    const spec = generateOpenAPISpec();
    return res.json(spec);
  } catch (error) {
    console.error('Erro ao gerar documentação OpenAPI:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};



