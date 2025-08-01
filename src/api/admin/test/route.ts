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

    // Verificar se é admin (middleware já fez isso, mas dupla verificação)
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return Response.json({
        success: false,
        error: 'Acesso negado - requer privilégios de administrador',
        codigo: 'ACESSO_NEGADO_ADMIN',
      }, { status: 403 });
    }

    return Response.json({
      success: true,
      message: 'Rota admin acessada com sucesso',
      user: {
        id: req.user.id,
        nome: req.user.nome,
        email: req.user.email,
        role: req.user.role,
      },
      adminFeatures: [
        'Gerenciar usuários',
        'Visualizar estatísticas',
        'Configurar sistema',
        'Acessar logs',
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Erro na rota de teste admin:', error);
    return Response.json({
      success: false,
      error: 'Erro interno do servidor',
      codigo: 'ERRO_INTERNO',
    }, { status: 500 });
  }
} 