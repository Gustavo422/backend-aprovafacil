import type { Request, Response } from 'express';
import { generateOpenAPISpec } from '../../src/core/documentation/openapi';

export const GET = (req: Request, res: Response) => {
  try {
    const spec = generateOpenAPISpec();
    return res.json(spec);
  } catch (error) {
    console.error('Erro ao gerar documentação OpenAPI:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};



