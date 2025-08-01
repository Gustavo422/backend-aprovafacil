import express, { Request, Response } from 'express';
import { supabase } from '../../config/supabase-unified.js';
import { requestLogger } from '../../middleware/logger.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { requireAuth } from '../../middleware/auth.js';
import { logger } from '../../lib/logger.js';

const router = express.Router();

// Aplicar middlewares globais
router.use(requestLogger);
router.use(rateLimit);

// ========================================
// GET - Buscar disciplinas
// ========================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const { categoria_id, ativo } = req.query;

    // Construir query base
    let query = supabase.from('disciplinas_categoria').select('*');

    // Aplicar filtros
    if (categoria_id) {
      query = query.eq('categoria_id', categoria_id);
    }

    if (ativo !== undefined) {
      query = query.eq('ativo', ativo === 'true');
    }

    // Executar query
    const { data: disciplinas, error } = await query.order('ordem', { ascending: true });

    if (error) {
      logger.error('Erro ao buscar disciplinas:', { error: error.message, code: error.code, details: error.details });
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar disciplinas',
      });
      return;
    }

    res.json({
      success: true,
      data: disciplinas || [],
    });
  } catch (error) {
    logger.error('Erro ao processar requisição GET /api/categoria-disciplinas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// ========================================
// POST - Criar disciplina (apenas admin)
// ========================================

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { categoria_id, nome, peso, horas_semanais, ordem } = req.body;

    // Validar dados obrigatórios
    if (!categoria_id || !nome || !peso || !horas_semanais || !ordem) {
      res.status(400).json({
        success: false,
        error: 'Todos os campos são obrigatórios',
      });
      return;
    }

    // Validar peso (1-100)
    if (peso < 1 || peso > 100) {
      res.status(400).json({
        success: false,
        error: 'Peso deve estar entre 1 e 100',
      });
      return;
    }

    // Validar horas semanais
    if (horas_semanais < 1) {
      res.status(400).json({
        success: false,
        error: 'Horas semanais deve ser maior que 0',
      });
      return;
    }

    // Verificar se a categoria existe
    const { data: categoria, error: categoriaError } = await supabase
      .from('categorias_concursos')
      .select('id')
      .eq('id', categoria_id)
      .eq('ativo', true)
      .single();

    if (categoriaError || !categoria) {
      res.status(404).json({
        success: false,
        error: 'Categoria não encontrada ou inativa',
      });
      return;
    }

    // Verificar se já existe disciplina com o mesmo nome na categoria
    const { data: existingDisciplina, error: existingError } = await supabase
      .from('disciplinas_categoria')
      .select('id')
      .eq('categoria_id', categoria_id)
      .eq('nome', nome)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      logger.error('Erro ao verificar disciplina existente:', { error: existingError.message, code: existingError.code, details: existingError.details });
      res.status(500).json({
        success: false,
        error: 'Erro ao verificar disciplina existente',
      });
      return;
    }

    if (existingDisciplina) {
      res.status(409).json({
        success: false,
        error: 'Disciplina já existe nesta categoria',
      });
      return;
    }

    // Criar disciplina
    const { data: disciplina, error } = await supabase
      .from('disciplinas_categoria')
      .insert({
        categoria_id,
        nome,
        peso,
        horas_semanais,
        ordem,
        ativo: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('Erro ao criar disciplina:', { error: error.message, code: error.code, details: error.details });
      res.status(500).json({
        success: false,
        error: 'Erro ao criar disciplina',
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Disciplina criada com sucesso',
      data: disciplina,
    });
  } catch (error) {
    logger.error('Erro ao processar requisição POST /api/categoria-disciplinas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// ========================================
// PUT - Atualizar disciplina
// ========================================

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { categoria_id, nome, peso, horas_semanais, ordem, ativo } = req.body;

    // Verificar se a disciplina existe
    const { data: existingDisciplina, error: existingError } = await supabase
      .from('disciplinas_categoria')
      .select('*')
      .eq('id', id)
      .single();

    if (existingError || !existingDisciplina) {
      res.status(404).json({
        success: false,
        error: 'Disciplina não encontrada',
      });
      return;
    }

    // Validar dados se fornecidos
    if (peso !== undefined && (peso < 1 || peso > 100)) {
      res.status(400).json({
        success: false,
        error: 'Peso deve estar entre 1 e 100',
      });
      return;
    }

    if (horas_semanais !== undefined && horas_semanais < 1) {
      res.status(400).json({
        success: false,
        error: 'Horas semanais deve ser maior que 0',
      });
      return;
    }

    // Atualizar disciplina
    const { data: disciplina, error } = await supabase
      .from('disciplinas_categoria')
      .update({
        categoria_id,
        nome,
        peso,
        horas_semanais,
        ordem,
        ativo,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Erro ao atualizar disciplina:', { error: error.message, code: error.code, details: error.details });
      res.status(500).json({
        success: false,
        error: 'Erro ao atualizar disciplina',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Disciplina atualizada com sucesso',
      data: disciplina,
    });
  } catch (error) {
    logger.error('Erro ao processar requisição PUT /api/categoria-disciplinas/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// ========================================
// DELETE - Deletar disciplina
// ========================================

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se a disciplina existe
    const { data: existingDisciplina, error: existingError } = await supabase
      .from('disciplinas_categoria')
      .select('id')
      .eq('id', id)
      .single();

    if (existingError || !existingDisciplina) {
      res.status(404).json({
        success: false,
        error: 'Disciplina não encontrada',
      });
      return;
    }

    // Deletar disciplina
    const { error } = await supabase
      .from('disciplinas_categoria')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Erro ao deletar disciplina:', { error: error.message, code: error.code, details: error.details });
      res.status(500).json({
        success: false,
        error: 'Erro ao deletar disciplina',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Disciplina deletada com sucesso',
    });
  } catch (error) {
    logger.error('Erro interno:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

// Registrar rotas
// TODO: Adicionar rotas específicas para cada arquivo

export { router };
