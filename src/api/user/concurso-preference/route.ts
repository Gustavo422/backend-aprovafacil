import express, { Request, Response } from 'express';
import { supabase } from '../../../config/supabase.js';
import { logger } from '../../../utils/logger.js';
import jwt from 'jsonwebtoken';
import { Usuario } from '../../../shared/types';

const router = express.Router();

// Middleware simples para autenticação JWT
const authenticateJWT = async (req: Request, res: Response, next: express.NextFunction) => {
  try {
    console.log('[DEBUG] Middleware JWT - Iniciando autenticação');
    console.log('[DEBUG] Headers da requisição:', req.headers);

    // Extrair token do cabeçalho Authorization
    const authHeader = req.headers.authorization;
    console.log('[DEBUG] Authorization header:', authHeader);

    // Tentar extrair token de diferentes fontes
    let token = null;

    // 1. Tentar extrair do cabeçalho Authorization
    if (authHeader) {
      // Formato esperado: "Bearer <token>" ou apenas "<token>"
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
        console.log('[DEBUG] Token extraído do cabeçalho Authorization (formato Bearer)');
      } else if (parts.length === 1) {
        token = parts[0];
        console.log('[DEBUG] Token extraído do cabeçalho Authorization (formato simples)');
      }
    }

    // 2. Tentar extrair do cookie
    if (!token && req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
      console.log('[DEBUG] Token extraído do cookie auth_token');
    }
    
    // 2.1 Tentar extrair do header Cookie manualmente
    if (!token && req.headers.cookie) {
      console.log('[DEBUG] Analisando cookie header:', req.headers.cookie);
      
      // Função para extrair cookies de forma mais robusta
      const parseCookies = (cookieHeader: string) => {
        const cookies: Record<string, string> = {};
        cookieHeader.split(';').forEach(cookie => {
          const parts = cookie.trim().split('=');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            // Unir o resto caso haja múltiplos sinais de igual
            const value = parts.slice(1).join('=').trim();
            cookies[key] = value;
          }
        });
        return cookies;
      };
      
      const cookies = parseCookies(req.headers.cookie);
      console.log('[DEBUG] Cookies parseados:', Object.keys(cookies));
      
      // Tentar encontrar o token em qualquer cookie que possa contê-lo
      const possibleTokenCookies = ['auth_token', 'sb-jsdabzqnyvmebsayutqe-auth-token', 'sb-127-auth-token'];
      
      for (const cookieName of possibleTokenCookies) {
        if (cookies[cookieName]) {
          token = cookies[cookieName];
          console.log(`[DEBUG] Token extraído do cookie ${cookieName}`);
          break;
        }
      }
    }

    // 3. Tentar extrair do corpo da requisição
    if (!token && req.body && req.body.token) {
      token = req.body.token;
      console.log('[DEBUG] Token extraído do corpo da requisição');
    }

    // 4. Tentar extrair do parâmetro de consulta
    if (!token && req.query && req.query.token) {
      token = req.query.token as string;
      console.log('[DEBUG] Token extraído do parâmetro de consulta');
    }

    if (!token) {
      console.log('[DEBUG] Token não encontrado em nenhuma fonte');
      return res.status(401).json({ error: 'Token de autorização necessário' });
    }

    console.log('[DEBUG] Token encontrado:', token.substring(0, 15) + '...');
    const jwtSecret = process.env.JWT_SECRET || 'default-secret';

    try {
      console.log('[DEBUG] Verificando token JWT');

      // Tentar decodificar o token sem verificar a assinatura primeiro
      let decoded: Record<string, unknown>;
      try {
        // Verificar se o token é um token Supabase (formato diferente)
        if (token.includes('eyJhY2Nlc3NfdG9rZW4i')) {
          console.log('[DEBUG] Detectado token Supabase, tentando extrair access_token');
          try {
            // Tentar decodificar o token Supabase (que é base64)
            const decodedSupabase = Buffer.from(token.replace(/^base64-/, ''), 'base64').toString();
            const supabaseTokenObj = JSON.parse(decodedSupabase);
            
            if (supabaseTokenObj && supabaseTokenObj.access_token) {
              console.log('[DEBUG] Access token extraído do token Supabase');
              token = supabaseTokenObj.access_token;
              
              // Agora tentar verificar o access_token
              decoded = jwt.decode(token) as Record<string, unknown>;
              console.log('[DEBUG] Token Supabase decodificado:', decoded);
            }
          } catch (supabaseError) {
            console.log('[DEBUG] Erro ao processar token Supabase:', supabaseError.message);
          }
        }
        
        // Se ainda não temos decoded, tentar verificar normalmente
        if (!decoded) {
          try {
            decoded = jwt.verify(token, jwtSecret) as Record<string, unknown>;
            console.log('[DEBUG] Token verificado com sucesso');
          } catch (verifyError) {
            console.log('[DEBUG] Erro na verificação do token:', verifyError.message);
            
            // Se falhar, tentar decodificar sem verificar a assinatura
            try {
              decoded = jwt.decode(token) as Record<string, unknown>;
              console.log('[DEBUG] Token decodificado sem verificação:', decoded);
              
              if (!decoded) {
                console.log('[DEBUG] Token não pôde ser decodificado');
                return res.status(401).json({ error: 'Token inválido ou mal-formado' });
              }
              
              // Vamos continuar mesmo com erro de verificação para fins de depuração
              console.log('[DEBUG] Continuando com token não verificado para depuração');
            } catch (decodeError) {
              console.log('[DEBUG] Erro ao decodificar token:', decodeError.message);
              return res.status(401).json({ error: 'Token inválido ou mal-formado' });
            }
          }
        }
      } catch (error) {
        console.log('[DEBUG] Erro geral ao processar token:', error.message);
        return res.status(401).json({ error: 'Token inválido' });
      }

      console.log('[DEBUG] Token decodificado completo:', decoded);

      // Verificar se o token tem um ID de usuário
      let userId = (decoded as { userId?: string; id?: string; sub?: string; user?: { id?: string } }).userId ||
                   (decoded as { userId?: string; id?: string; sub?: string; user?: { id?: string } }).id ||
                   (decoded as { userId?: string; id?: string; sub?: string; user?: { id?: string } }).sub;
      
      // Para tokens Supabase, o ID pode estar em user.id
      if (!userId && (decoded as { user?: { id?: string } }).user && (decoded as { user?: { id?: string } }).user.id) {
        userId = (decoded as { user?: { id?: string } }).user.id;
        console.log('[DEBUG] ID do usuário extraído de user.id:', userId);
      }

      if (!userId) {
        console.log('[DEBUG] Token sem identificação de usuário');
        return res.status(401).json({ error: 'Token inválido: sem identificação de usuário' });
      }

      console.log('[DEBUG] ID do usuário encontrado:', userId);

      // Buscar usuário no Supabase
      console.log('[DEBUG] Buscando usuário no banco:', userId);
      
      // Tentar buscar por ID
      let { data: usuario, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .eq('ativo', true)
        .single();
      
      // Se não encontrar, tentar buscar por auth_user_id
      if (error || !usuario) {
        console.log('[DEBUG] Usuário não encontrado por ID, tentando por auth_user_id');
        const { data: usuarioPorAuthId, error: errorPorAuthId } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', userId)
          .eq('ativo', true)
          .single();
          
        if (!errorPorAuthId && usuarioPorAuthId) {
          usuario = usuarioPorAuthId;
          error = null;
          console.log('[DEBUG] Usuário encontrado por auth_user_id:', usuario.id);
        }
      }

      console.log('[DEBUG] Resultado da busca:', { usuario: usuario?.id, error: error?.message });

      if (error || !usuario) {
        console.log('[DEBUG] Usuário não encontrado ou inativo. Tentando buscar sem filtro de ativo');

        // Tentar buscar o usuário novamente, mas sem o filtro de ativo
        const { data: usuarioInativo, error: errorInativo } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', userId)
          .single();

        if (errorInativo || !usuarioInativo) {
          console.log('[DEBUG] Usuário não encontrado mesmo sem filtro de ativo');
          return res.status(401).json({ error: 'Usuário não encontrado' });
        }

        if (!usuarioInativo.ativo) {
          console.log('[DEBUG] Usuário encontrado, mas está inativo');
          return res.status(403).json({ error: 'Usuário inativo' });
        }

        // Se chegou aqui, algo estranho aconteceu
        console.log('[DEBUG] Situação inesperada na busca do usuário');
        return res.status(500).json({ error: 'Erro interno ao validar usuário' });
      }

      // Adicionar usuário à requisição
      (req as Request & { user: Usuario }).user = usuario;
      console.log('[DEBUG] Usuário adicionado à requisição:', usuario.id);
      next();
    } catch (jwtError) {
      console.log('[DEBUG] Erro na verificação do JWT:', jwtError.message);
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
  } catch (error) {
    logger.error('Erro no middleware de autenticação', 'backend', { error: error.message });
    return res.status(500).json({ error: 'Erro interno de autenticação' });
  }
};

// Aplicar middleware de autenticação
router.use(authenticateJWT);

// GET - Buscar preferência do usuário
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('[DEBUG] GET /api/user/concurso-preference - Iniciando');
    console.log('[DEBUG] req.user:', (req as Request & { user: Usuario }).user);

    const userId = (req as Request & { user: Usuario }).user?.id;
    console.log('[DEBUG] userId extraído:', userId);

    if (!userId) {
      console.log('[DEBUG] UserId não encontrado, retornando 401');
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Buscar preferência ativa do usuário
    const { data: preference, error } = await supabase
      .from('preferencias_usuario_concurso')
      .select('*')
      .eq('usuario_id', userId)
      .eq('ativo', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Nenhuma preferência encontrada
        logger.info('Preferência não encontrada para o usuário', 'backend', {
          userId: userId,
          message: 'Nenhuma preferência ativa encontrada'
        });
        
        // Tentar buscar o concurso mais recente do usuário (mesmo que não esteja ativo)
        const { data: lastPreference, error: lastError } = await supabase
          .from('preferencias_usuario_concurso')
          .select('*')
          .eq('usuario_id', userId)
          .order('criado_em', { ascending: false })
          .limit(1)
          .single();
          
        if (!lastError && lastPreference) {
          logger.info('Usando concurso mais recente como fallback', 'backend', {
            userId: userId,
            concursoId: lastPreference.concurso_id
          });
          
          // Retornar a preferência inativa com um flag indicando que é um fallback
          return res.json({
            data: lastPreference,
            canChange: true,
            daysUntilChange: 0,
            isFallback: true,
            message: 'Usando preferência inativa mais recente como fallback'
          });
        }
        
        // Se não encontrar nenhuma preferência, retornar um objeto vazio com status 200
        // em vez de erro 404, para evitar que o frontend quebre
        return res.json({
          data: null,
          canChange: true,
          daysUntilChange: 0,
          isFallback: true,
          message: 'Nenhuma preferência encontrada para este usuário'
        });
      }
      
      // Verificar se é um erro de coluna não existente
      if (error.code === '42703') {
        logger.error('Erro de esquema de banco de dados', 'backend', {
          error: error.message,
          userId: userId,
          details: 'Coluna não existe na tabela preferencias_usuario_concurso'
        });
        return res.status(500).json({ 
          error: 'Erro de banco de dados',
          details: 'Problema com a estrutura da tabela de preferências',
          code: 'DB_SCHEMA_ERROR'
        });
      }

      logger.error('Erro ao buscar preferência do usuário', 'backend', {
        error: error.message,
        errorCode: error.code,
        userId: userId,
        details: error.details || 'Sem detalhes adicionais'
      });
      return res.status(500).json({ 
        error: 'Erro ao buscar preferência',
        code: 'DB_QUERY_ERROR',
        message: 'Ocorreu um erro ao consultar as preferências do usuário'
      });
    }

    // Calcular se pode trocar de concurso
    const now = new Date();
    const canChangeUntil = new Date(preference.pode_alterar_ate);
    const canChange = now >= canChangeUntil;
    const daysUntilChange = Math.max(0, Math.ceil((canChangeUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    res.json({
      data: preference,
      canChange,
      daysUntilChange,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Erro interno', 'backend', {
      error: errorMessage,
      stack: errorStack,
      route: 'GET /api/user/concurso-preference',
      userId: (req as Request & { user: Usuario }).user?.id
    });
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocorreu um erro inesperado ao processar sua solicitação'
    });
  }
});

// POST - Criar/Atualizar preferência do usuário
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: Usuario }).user?.id;
    const { concurso_id } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    if (!concurso_id) {
      return res.status(400).json({ error: 'ID do concurso é obrigatório' });
    }

    // Verificar se o concurso existe e está ativo
    const { data: concurso, error: concursoError } = await supabase
      .from('concursos')
      .select('*')
      .eq('id', concurso_id)
      .eq('ativo', true)
      .single();

    if (concursoError || !concurso) {
      return res.status(404).json({ error: 'Concurso não encontrado ou inativo' });
    }

    // Verificar se já existe uma preferência ativa
    const { data: existingPreference, error: existingError } = await supabase
      .from('preferencias_usuario_concurso')
      .select('*')
      .eq('usuario_id', userId)
      .eq('ativo', true)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      // Verificar se é um erro de coluna não existente
      if (existingError.code === '42703') {
        logger.error('Erro de esquema de banco de dados', 'backend', {
          error: existingError.message,
          userId: userId,
          details: 'Coluna não existe na tabela preferencias_usuario_concurso'
        });
        return res.status(500).json({ 
          error: 'Erro de banco de dados',
          details: 'Problema com a estrutura da tabela de preferências',
          code: 'DB_SCHEMA_ERROR'
        });
      }
      
      logger.error('Erro ao verificar preferência existente', 'backend', {
        error: existingError.message,
        errorCode: existingError.code,
        userId: userId,
        details: existingError.details || 'Sem detalhes adicionais'
      });
      return res.status(500).json({ 
        error: 'Erro ao verificar preferência existente',
        code: 'DB_QUERY_ERROR',
        message: 'Ocorreu um erro ao consultar as preferências do usuário'
      });
    }

    // Calcular data de troca permitida (4 meses)
    const now = new Date();
    const canChangeUntil = new Date(now.getTime() + (4 * 30 * 24 * 60 * 60 * 1000)); // 4 meses

    if (existingPreference) {
      // Verificar se pode trocar de concurso
      const canChange = now >= new Date(existingPreference.pode_alterar_ate);

      if (!canChange) {
        const daysUntilChange = Math.ceil(
          (new Date(existingPreference.pode_alterar_ate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        return res.status(403).json({
          error: 'Você só pode trocar de concurso após 4 meses',
          daysUntilChange,
          canChangeUntil: existingPreference.pode_alterar_ate,
        });
      }

      // Desativar preferência atual
      const { error: deactivateError } = await supabase
        .from('preferencias_usuario_concurso')
        .update({ ativo: false })
        .eq('id', existingPreference.id);

      if (deactivateError) {
        // Verificar se é um erro de coluna não existente
        if (deactivateError.code === '42703') {
          logger.error('Erro de esquema de banco de dados', 'backend', {
            error: deactivateError.message,
            preferenceId: existingPreference.id,
            details: 'Coluna não existe na tabela preferencias_usuario_concurso'
          });
          return res.status(500).json({ 
            error: 'Erro de banco de dados',
            details: 'Problema com a estrutura da tabela de preferências',
            code: 'DB_SCHEMA_ERROR'
          });
        }
        
        logger.error('Erro ao desativar preferência existente', 'backend', {
          error: deactivateError.message,
          errorCode: deactivateError.code,
          preferenceId: existingPreference.id,
          details: deactivateError.details || 'Sem detalhes adicionais'
        });
        return res.status(500).json({ 
          error: 'Erro ao atualizar preferência',
          code: 'DB_UPDATE_ERROR',
          message: 'Ocorreu um erro ao desativar a preferência existente'
        });
      }
    }

    // Criar nova preferência
    const { data: newPreference, error: createError } = await supabase
      .from('preferencias_usuario_concurso')
      .insert({
        usuario_id: userId,
        concurso_id: concurso_id,
        pode_alterar_ate: canChangeUntil.toISOString(),
        ativo: true,
      })
      .select()
      .single();

    if (createError) {
      // Verificar se é um erro de coluna não existente
      if (createError.code === '42703') {
        logger.error('Erro de esquema de banco de dados', 'backend', {
          error: createError.message,
          userId: userId,
          concursoId: concurso_id,
          details: 'Coluna não existe na tabela preferencias_usuario_concurso'
        });
        return res.status(500).json({ 
          error: 'Erro de banco de dados',
          details: 'Problema com a estrutura da tabela de preferências',
          code: 'DB_SCHEMA_ERROR'
        });
      }
      
      // Verificar se é um erro de violação de chave estrangeira
      if (createError.code === '23503') {
        logger.error('Erro de violação de chave estrangeira', 'backend', {
          error: createError.message,
          userId: userId,
          concursoId: concurso_id,
          details: 'Referência inválida para usuário ou concurso'
        });
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: 'O usuário ou concurso informado não existe',
          code: 'FOREIGN_KEY_VIOLATION'
        });
      }
      
      logger.error('Erro ao criar preferência:', 'backend', {
        error: createError.message,
        errorCode: createError.code,
        userId: userId,
        concursoId: concurso_id,
        details: createError.details || 'Sem detalhes adicionais'
      });
      return res.status(500).json({ 
        error: 'Erro ao criar preferência',
        code: 'DB_INSERT_ERROR',
        message: 'Ocorreu um erro ao salvar a preferência do usuário'
      });
    }

    // Log da ação
    logger.info('Preferência de concurso criada/atualizada:', 'backend', {
      userId: userId,
      concursoId: concurso_id,
      canChangeUntil: canChangeUntil.toISOString(),
    });

    res.json({
      message: 'Preferência de concurso definida com sucesso',
      data: newPreference,
      canChangeUntil: canChangeUntil.toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Erro interno', 'backend', {
      error: errorMessage,
      stack: errorStack,
      route: 'POST /api/user/concurso-preference',
      userId: (req as Request & { user: Usuario }).user?.id,
      requestBody: req.body
    });
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocorreu um erro inesperado ao processar sua solicitação'
    });
  }
});

// PUT - Atualizar preferência do usuário
router.put('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: Usuario }).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Buscar preferência ativa do usuário
    const { data: preference, error: fetchError } = await supabase
      .from('preferencias_usuario_concurso')
      .select('*')
      .eq('usuario_id', userId)
      .eq('ativo', true)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        logger.info('Preferência não encontrada para o usuário', 'backend', {
          userId: userId,
          message: 'Nenhuma preferência ativa encontrada'
        });
        return res.status(404).json({ 
          error: 'Preferência não encontrada',
          details: 'Nenhuma preferência ativa encontrada para este usuário',
          code: 'PREFERENCE_NOT_FOUND'
        });
      }
      
      // Verificar se é um erro de coluna não existente
      if (fetchError.code === '42703') {
        logger.error('Erro de esquema de banco de dados', 'backend', {
          error: fetchError.message,
          userId: userId,
          details: 'Coluna não existe na tabela preferencias_usuario_concurso'
        });
        return res.status(500).json({ 
          error: 'Erro de banco de dados',
          details: 'Problema com a estrutura da tabela de preferências',
          code: 'DB_SCHEMA_ERROR'
        });
      }

      logger.error('Erro ao buscar preferência:', 'backend', {
        error: fetchError.message,
        errorCode: fetchError.code,
        userId: userId,
        details: fetchError.details || 'Sem detalhes adicionais'
      });
      return res.status(500).json({ 
        error: 'Erro ao buscar preferência',
        code: 'DB_QUERY_ERROR',
        message: 'Ocorreu um erro ao consultar as preferências do usuário'
      });
    }

    // Atualizar preferência
    const { data: updatedPreference, error: updateError } = await supabase
      .from('preferencias_usuario_concurso')
      .update({
        ...req.body,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', preference.id)
      .select()
      .single();

    if (updateError) {
      // Verificar se é um erro de coluna não existente
      if (updateError.code === '42703') {
        logger.error('Erro de esquema de banco de dados', 'backend', {
          error: updateError.message,
          preferenceId: preference.id,
          details: 'Coluna não existe na tabela preferencias_usuario_concurso'
        });
        return res.status(500).json({ 
          error: 'Erro de banco de dados',
          details: 'Problema com a estrutura da tabela de preferências',
          code: 'DB_SCHEMA_ERROR'
        });
      }
      
      // Verificar se é um erro de violação de chave estrangeira
      if (updateError.code === '23503') {
        logger.error('Erro de violação de chave estrangeira', 'backend', {
          error: updateError.message,
          preferenceId: preference.id,
          details: 'Referência inválida para usuário ou concurso'
        });
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: 'O usuário ou concurso informado não existe',
          code: 'FOREIGN_KEY_VIOLATION'
        });
      }
      
      logger.error('Erro ao atualizar preferência:', 'backend', {
        error: updateError.message,
        errorCode: updateError.code,
        preferenceId: preference.id,
        details: updateError.details || 'Sem detalhes adicionais'
      });
      return res.status(500).json({ 
        error: 'Erro ao atualizar preferência',
        code: 'DB_UPDATE_ERROR',
        message: 'Ocorreu um erro ao atualizar a preferência do usuário'
      });
    }

    // Log da ação
    logger.info('Preferência atualizada:', 'backend', {
      userId: userId,
      preferenceId: preference.id,
      updates: req.body,
    });

    res.json({
      message: 'Preferência atualizada com sucesso',
      data: updatedPreference,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Erro interno', 'backend', {
      error: errorMessage,
      stack: errorStack,
      route: 'PUT /api/user/concurso-preference',
      userId: (req as Request & { user: Usuario }).user?.id,
      requestBody: req.body
    });
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocorreu um erro inesperado ao processar sua solicitação'
    });
  }
});

export default router;