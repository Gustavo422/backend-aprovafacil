// Controller administrativo completo para o AprovaFácil
import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service.js';
import { ILogService } from '../../core/interfaces/index.js';

export class AdminController {
  private adminService: AdminService;
  private logService: ILogService;

  constructor(adminService: AdminService, logService: ILogService) {
    this.adminService = adminService;
    this.logService = logService;
  }

  // ===== GESTÃO DE CATEGORIAS DE CONCURSOS =====
  
  async criarCategoriasConcursos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.criarCategoriasConcursos(req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async listarCategoriasConcursos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.listarCategoriasConcursos(req.query);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async atualizarCategoriasConcursos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.atualizarCategoriasConcursos(id, req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async excluirCategoriasConcursos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.excluirCategoriasConcursos(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  // ===== GESTÃO DE CONCURSOS =====

  async criarConcurso(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.criarConcurso(req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async listarConcursos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.listarConcursos(req.query);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async atualizarConcurso(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.atualizarConcurso(id, req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async excluirConcurso(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.excluirConcurso(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  // ===== GESTÃO DE DISCIPLINAS POR CATEGORIA =====

  async criarDisciplinasCategoria(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.criarDisciplinasCategoria(req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async listarDisciplinasCategoria(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.listarDisciplinasCategoria(req.query);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async atualizarDisciplinasCategoria(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.atualizarDisciplinasCategoria(id, req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async excluirDisciplinasCategoria(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.excluirDisciplinasCategoria(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  // ===== GESTÃO DE SIMULADOS =====

  async criarSimulado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.criarSimulado(req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async listarSimulados(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.listarSimulados(req.query);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async obterSimulado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.obterSimulado(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async atualizarSimulado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.atualizarSimulado(id, req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async excluirSimulado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.excluirSimulado(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  // ===== GESTÃO DE QUESTÕES DE SIMULADOS =====

  async adicionarQuestoesSimulado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { simulado_id } = req.params;
      const resultado = await this.adminService.adicionarQuestoesSimulado(simulado_id, req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async listarQuestoesSimulado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { simulado_id } = req.params;
      const resultado = await this.adminService.listarQuestoesSimulado(simulado_id, req.query);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async atualizarQuestaoSimulado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.atualizarQuestaoSimulado(id, req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async excluirQuestaoSimulado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.excluirQuestaoSimulado(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  // ===== GESTÃO DE QUESTÕES SEMANAIS =====

  async criarQuestoesSemana(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.criarQuestoesSemana(req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async listarQuestoesSemana(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.listarQuestoesSemana(req.query);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async obterQuestoesSemana(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.obterQuestoesSemana(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async atualizarQuestoesSemana(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.atualizarQuestoesSemana(id, req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async excluirQuestoesSemana(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.excluirQuestoesSemana(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  // ===== GESTÃO DE FLASHCARDS =====

  async criarFlashcards(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.criarFlashcards(req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async listarFlashcards(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.listarFlashcards(req.query);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async obterFlashcard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.obterFlashcard(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async atualizarFlashcard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.atualizarFlashcard(id, req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async excluirFlashcard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.excluirFlashcard(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  // ===== GESTÃO DE APOSTILAS =====

  async criarApostila(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.criarApostila(req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async listarApostilas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.listarApostilas(req.query);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async obterApostila(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.obterApostila(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async atualizarApostila(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.atualizarApostila(id, req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async excluirApostila(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.excluirApostila(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  // ===== GESTÃO DE CONTEÚDO DE APOSTILAS =====

  async adicionarConteudoApostila(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { apostila_id } = req.params;
      const resultado = await this.adminService.adicionarConteudoApostila(apostila_id, req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async listarConteudoApostila(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { apostila_id } = req.params;
      const resultado = await this.adminService.listarConteudoApostila(apostila_id, req.query);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async atualizarConteudoApostila(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.atualizarConteudoApostila(id, req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async excluirConteudoApostila(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.excluirConteudoApostila(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  // ===== GESTÃO DE MAPA DE ASSUNTOS =====

  async criarMapaAssuntos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.criarMapaAssuntos(req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async listarMapaAssuntos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.listarMapaAssuntos(req.query);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async atualizarMapaAssuntos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.atualizarMapaAssuntos(id, req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async excluirMapaAssuntos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.excluirMapaAssuntos(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  // ===== GESTÃO DE USUÁRIOS (APENAS CRIAÇÃO E GERENCIAMENTO) =====

  async listarUsuarios(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.listarUsuarios(req.query);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async obterUsuario(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.obterUsuario(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async atualizarUsuario(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.atualizarUsuario(id, req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async ativarUsuario(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.ativarUsuario(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async desativarUsuario(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.desativarUsuario(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  // ===== GESTÃO DE CONFIGURAÇÕES DE CACHE =====

  async criarConfiguracaoCache(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.criarConfiguracaoCache(req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async listarConfiguracaoCache(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.listarConfiguracaoCache();
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async atualizarConfiguracaoCache(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.atualizarConfiguracaoCache(id, req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async excluirConfiguracaoCache(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const resultado = await this.adminService.excluirConfiguracaoCache(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  // ===== OPERAÇÕES EM LOTE =====

  async importarDadosLote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tipo } = req.params;
      const resultado = await this.adminService.importarDadosLote(tipo as 'apostilas', req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async exportarDados(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tipo } = req.params;
      const resultado = await this.adminService.exportarDados(tipo, req.query);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  // ===== VALIDAÇÃO DE DADOS JSON =====

  async validarJsonSimulado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.validarJsonSimulado(req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async validarJsonQuestoesSemana(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.validarJsonQuestoesSemana(req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async validarJsonApostila(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.validarJsonApostila(req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  // ===== ESTATÍSTICAS E RELATÓRIOS =====

  async obterEstatisticasSistema(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.obterEstatisticasSistema();
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async obterRelatorioConteudo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.obterRelatorioConteudo(req.query);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async obterRelatorioUsuarios(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.obterRelatorioUsuarios(req.query);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  // ===== SISTEMA E MANUTENÇÃO =====

  async executarTestes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.executarTestes();
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async limparCache(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.limparCache();
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async obterLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.obterLogs(req.query);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async obterMetricas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.obterMetricas();
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async executarBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.executarBackup();
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async restaurarBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await this.adminService.restaurarBackup(req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }
}

export default AdminController;