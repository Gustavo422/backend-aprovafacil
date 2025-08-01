import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/optimized-auth.middleware';
import { logger } from '../../../lib/logger.js';

export async function GET(request: Request) {
  try {
    // O middleware já validou a autenticação e definiu req.user
    const req = request as unknown as AuthenticatedRequest;
    
    if (!req.user) {
      return Response.json({
        success: false,
        error: 'Usuário não autenticado',
        codigo: 'USUARIO_NAO_AUTENTICADO',
      }, { status: 401 });
    }

    return Response.json({
      success: true,
      message: 'Rota protegida acessada com sucesso',
      user: {
        id: req.user.id,
        nome: req.user.nome,
        email: req.user.email,
        role: req.user.role,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Erro na rota protegida de teste:', error);
    return Response.json({
      success: false,
      error: 'Erro interno do servidor',
      codigo: 'ERRO_INTERNO',
    }, { status: 500 });
  }
} 