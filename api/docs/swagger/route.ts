import { Request, Response } from 'express';
import { serveSwaggerUI } from '../../../src/core/documentation/swagger-ui';

export const GET = async (req: Request, res: Response) => {
  try {
    const response = serveSwaggerUI();
    const html = await response.text();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.send(html);
  } catch (error) {
    console.error('Erro ao servir Swagger UI:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}; 



