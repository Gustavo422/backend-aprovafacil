import { Request, Response } from 'express';
import { supabase } from '../../../config/supabase-unified.js';
import { logger } from '../../../lib/logger.js';
import jwt from 'jsonwebtoken';

// Interface para request com usuário autenticado
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    nome?: string;
    ativo?: boolean;
    primeiro_login?: boolean;
    is_admin?: boolean;
  };
}

// Função para verificar token JWT
function verifyJWTToken(token: string): any {
  try {
    const secret = process.env.JWT_SECRET || 'seu_jwt_secret_aqui_com_pelo_menos_32_caracteres';
    return jwt.verify(token, secret);
  } catch (error) {
    logger.error('Erro ao verificar token JWT:', { 
      component: 'backend',
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export const getConcursoPreferenceHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Token de autenticação não fornecido', { 
        component: 'backend',
        url: req.url,
        method: req.method, 
      });
      return res.status(401).json({
        success: false,
        error: 'Token de autenticação não fornecido',
      });
    }

    const token = authHeader.substring(7);
    
    // Verificar token JWT em vez de Supabase Auth
    const decoded = verifyJWTToken(token);
    
    if (!decoded || !decoded.id) {
      logger.warn('Token JWT inválido ou expirado', { 
        component: 'backend',
        url: req.url,
        method: req.method, 
      });
      return res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado',
      });
    }

    const userId = decoded.id;

    logger.info('Buscando preferências do usuário', { 
      component: 'backend',
      userId: userId,
      url: req.url, 
    });

    // Buscar preferências do usuário
    const { data: preferences, error: preferencesError } = await supabase
      .from('preferencias_usuario_concurso')
      .select(`
        *,
        concursos (
          id,
          nome,
          slug,
          descricao,
          ano,
          banca,
          categoria_id
        )
      `)
      .eq('usuario_id', userId)
      .eq('ativo', true);

    if (preferencesError) {
      logger.error('Erro ao buscar preferências:', { 
        component: 'backend',
        error: preferencesError,
        userId: userId, 
      });
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar preferências',
      });
    }

    logger.info('Preferências encontradas', { 
      component: 'backend',
      userId: userId,
      count: preferences?.length || 0, 
    });

    return res.json({
      success: true,
      preferences: preferences || [],
    });

  } catch (error) {
    logger.error('Erro ao processar requisição:', { 
      component: 'backend',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined, 
    });
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
};

export const postConcursoPreferenceHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Token de autenticação não fornecido', { 
        component: 'backend',
        url: req.url,
        method: req.method, 
      });
      return res.status(401).json({
        success: false,
        error: 'Token de autenticação não fornecido',
      });
    }

    const token = authHeader.substring(7);
    
    // Verificar token JWT em vez de Supabase Auth
    const decoded = verifyJWTToken(token);
    
    if (!decoded || !decoded.id) {
      logger.warn('Token JWT inválido ou expirado', { 
        component: 'backend',
        url: req.url,
        method: req.method, 
      });
      return res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado',
      });
    }

    const userId = decoded.id;
    const body = req.body;
    const { concurso_id, preferencias } = body;

    if (!concurso_id) {
      logger.warn('ID do concurso não fornecido', { 
        component: 'backend',
        userId: userId,
        body, 
      });
      return res.status(400).json({
        success: false,
        error: 'ID do concurso é obrigatório',
      });
    }

    logger.info('Salvando preferências do usuário', { 
      component: 'backend',
      userId: userId,
      concursoId: concurso_id, 
    });

    // Criar/atualizar preferências
    const { data, error: createError } = await supabase
      .from('preferencias_usuario_concurso')
      .upsert({
        usuario_id: userId,
        concurso_id,
        preferencias: preferencias || {},
        ativo: true,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      })
      .select(`
        *,
        concursos (
          id,
          nome,
          slug,
          descricao,
          ano,
          banca,
          categoria_id
        )
      `)
      .single();

    if (createError) {
      logger.error('Erro ao salvar preferências:', { 
        component: 'backend',
        error: createError,
        userId: userId,
        concursoId: concurso_id, 
      });
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar preferências',
      });
    }

    logger.info('Preferências salvas com sucesso', { 
      component: 'backend',
      userId: userId,
      concursoId: concurso_id, 
    });

    return res.json({
      success: true,
      message: 'Preferências salvas com sucesso',
      data,
    });

  } catch (error) {
    logger.error('Erro ao processar requisição:', { 
      component: 'backend',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined, 
    });
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
};

// Criar router Express
import { Router } from 'express';

const router = Router();

// Registrar rotas
router.get('/', getConcursoPreferenceHandler);
router.post('/', postConcursoPreferenceHandler);

export { router };