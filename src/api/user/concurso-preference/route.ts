import express from 'express';
import { logger } from '../../../lib/logger.js';
import { supabase } from '../../../config/supabase-unified.js';
import jwt from 'jsonwebtoken';

// Interface para request com usuário autenticado
interface AuthenticatedRequest extends express.Request {
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
function verifyJWTToken(token: string): { id: string; email: string; role: string } | null {
  try {
    const secret = process.env.JWT_SECRET || 'seu_jwt_secret_aqui_com_pelo_menos_32_caracteres';
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === 'object' && decoded && 'usuarioId' in decoded) {
      const decodedObj = decoded as { usuarioId: string; email: string; role: string };
      return {
        id: decodedObj.usuarioId,
        email: decodedObj.email,
        role: decodedObj.role,
      };
    }
    return null;
  } catch (error) {
    logger.error('Erro ao verificar token JWT:', { 
      component: 'backend',
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export const getConcursoPreferenceHandler = async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
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
    
    if (!decoded?.id) {
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
      userId,
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
        userId, 
      });
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar preferências',
      });
    }

    logger.info('Preferências encontradas', { 
      component: 'backend',
      userId,
      count: preferences?.length || 0, 
    });

    // Se não há preferências, retornar null
    if (preferences.length === 0) {
      return res.json({
        success: true,
        data: null,
      });
    }

    // Pegar a primeira preferência ativa
    const preference = preferences[0];
    
    if (!preference) {
      return res.json({
        success: true,
        data: null,
      });
    }

    const concursoData = preference.concurso as { categoria_id?: string } | null;
    const podeAlterarAte = preference.pode_alterar_ate as string | null;
    const criadoEm = preference.criado_em as string;
    const atualizadoEm = preference.atualizado_em as string;
    
    return res.json({
      success: true,
      data: {
        concurso_id: preference.concurso_id,
        categoria_id: concursoData?.categoria_id ?? null,
        pode_alterar_ate: podeAlterarAte ?? null,
        criado_em: criadoEm,
        atualizado_em: atualizadoEm,
      },
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

export const postConcursoPreferenceHandler = async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
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
    
    if (!decoded?.id) {
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
    const body = req.body as { concurso_id: string; preferencias?: Record<string, unknown> };
    const { concurso_id, preferencias } = body;

    if (!concurso_id) {
      logger.warn('ID do concurso não fornecido', { 
        component: 'backend',
        userId,
        body, 
      });
      return res.status(400).json({
        success: false,
        error: 'ID do concurso é obrigatório',
      });
    }

    logger.info('Salvando preferências do usuário', { 
      component: 'backend',
      userId,
      concursoId: concurso_id, 
    });

    // Criar/atualizar preferências
    const { data, error: createError } = await supabase
      .from('preferencias_usuario_concurso')
      .upsert({
        usuario_id: userId,
        concurso_id,
        preferencias: preferencias ?? {},
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
        userId,
        concursoId: concurso_id, 
      });
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar preferências',
      });
    }

    logger.info('Preferências salvas com sucesso', { 
      component: 'backend',
      userId,
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
const router = express.Router();

// Registrar rotas
router.get('/', (req, res) => {
  getConcursoPreferenceHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em getConcursoPreferenceHandler', { error });
    res.status(500).json({ error: 'Erro interno do servidor' });
  });
});
router.post('/', (req, res) => {
  postConcursoPreferenceHandler(req as AuthenticatedRequest, res).catch((error) => {
    logger.error('Erro não tratado em postConcursoPreferenceHandler', { error });
    res.status(500).json({ error: 'Erro interno do servidor' });
  });
});

export default router;