import { Request, Response } from 'express';
import { logger } from '../../lib/logger.js';
import { ConcursosService } from '../../core/concursos.service.js';

function getStringParam(param: unknown): string | undefined {
  if (typeof param === 'string') return param;
  if (Array.isArray(param) && typeof param[0] === 'string') return param[0];
  return undefined;
}

function getNumberParam(param: unknown): number | undefined {
  const str = getStringParam(param);
  if (str && !isNaN(Number(str))) return Number(str);
  return undefined;
}

function getBooleanOrStringParam(param: unknown): boolean | string | undefined {
  const str = getStringParam(param);
  if (str === 'true') return true;
  if (str === 'false') return false;
  return str;
}

export class ConcursosController {
  static async listar(req: Request, res: Response) {
    try {
      const {
        page = '1',
        limit = '10',
        categoria_id,
        ano,
        banca,
        ativo,
        search,
      } = req.query;
      const result = await ConcursosService.listar({
        page: Number(page),
        limit: Number(limit),
        categoria_id: getStringParam(categoria_id),
        ano: getNumberParam(ano),
        banca: getStringParam(banca),
        ativo: getBooleanOrStringParam(ativo),
        search: getStringParam(search),
      });
      res.json({
        success: true,
        data: result.concursos,
        pagination: result.pagination,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao processar requisição GET /api/concursos:', { error: errorMessage });
      res.status(500).json({
        success: false,
        error: 'Erro interno no servidor',
        details: errorMessage,
      });
    }
  }

  static async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const concurso = await ConcursosService.buscarPorId(id);
      res.json({
        success: true,
        data: concurso,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorCode = (error as { code?: string }).code;
      
      if (errorCode === 'PGRST116') {
        res.status(404).json({
          success: false,
          error: 'Concurso não encontrado',
        });
        return;
      }
      logger.error('Erro ao buscar concurso:', { error: errorMessage });
      res.status(500).json({
        success: false,
        error: 'Erro interno ao buscar concurso',
        details: errorMessage,
      });
    }
  }

  static async criar(req: Request, res: Response) {
    try {
      const concursoData = req.body;
      const concurso = await ConcursosService.criar(concursoData);
      res.status(201).json({
        success: true,
        data: concurso,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorCode = (error as { code?: string }).code;
      
      if (errorCode === '23505') {
        res.status(400).json({
          success: false,
          error: 'Concurso já existe com esses dados',
        });
        return;
      }
      logger.error('Erro ao criar concurso:', { error: errorMessage });
      res.status(500).json({
        success: false,
        error: 'Erro interno ao criar concurso',
        details: errorMessage,
      });
    }
  }

  static async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const concursoData = req.body;
      const concurso = await ConcursosService.atualizar(id, concursoData);
      res.json({
        success: true,
        data: concurso,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorCode = (error as { code?: string }).code;
      
      if (errorCode === 'PGRST116') {
        res.status(404).json({
          success: false,
          error: 'Concurso não encontrado para atualização',
        });
        return;
      }
      logger.error('Erro ao atualizar concurso:', { error: errorMessage });
      res.status(500).json({
        success: false,
        error: 'Erro interno ao atualizar concurso',
        details: errorMessage,
      });
    }
  }

  static async excluir(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await ConcursosService.excluir(id);
      res.status(204).send();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorCode = (error as { code?: string }).code;

      if (errorCode === 'PGRST116') {
        res.status(404).json({
          success: false,
          error: 'Concurso não encontrado para exclusão',
        });
        return;
      }
      logger.error('Erro ao excluir concurso:', { error: errorMessage });
      res.status(500).json({
        success: false,
        error: 'Erro interno ao excluir concurso',
        details: errorMessage,
      });
    }
  }
} 

export const getConcursos = ConcursosController.listar;
export const getConcursoById = ConcursosController.buscarPorId;
export const createConcurso = ConcursosController.criar;
export const updateConcurso = ConcursosController.atualizar;
export const deleteConcurso = ConcursosController.excluir; 



