// Rotas administrativas completas para o AprovaFácil
import { Router } from 'express';
import { AdminController } from '../modules/admin/admin.controller.js';
import { AdminService } from '../modules/admin/admin.service.js';
import { CacheController } from '../modules/admin/cache.controller.js';
import { LogService } from '../core/utils/log.service.js';
import { CacheService } from '../core/utils/cache.service.js';
import { CacheManager } from '../core/utils/cache-manager.js';
import { CacheProvider } from '../core/utils/cache-factory.js';
import { UsuarioRepository } from '../modules/usuarios/usuario.repository.js';
import { SupabaseConfig } from '../core/database/supabase.js';
// IMPORTANTE: Em ambiente ESM, o Node exige a extensão '.js' nos imports após o build.
import benchmarksRoute from '../api/admin/benchmarks/route.js';
import { requireAuth, requireAdmin, validateCsrf } from '../middleware/auth.js';
import bcrypt from 'bcrypt';

export function createAdminRoutes(): Router {
  const router = Router();
  
  // Apply CSRF protection to all admin routes
  router.use(validateCsrf);
  
  // Inicializar dependências
  const supabase = SupabaseConfig.getInstance();
  const logService = new LogService(supabase, 'ADMIN');
  const cacheService = new CacheService(supabase, logService);
  const usuarioRepository = new UsuarioRepository(logService);
  
  // Inicializar serviços
  const cacheManager = CacheManager.getInstance(
    process.env.CACHE_PROVIDER as CacheProvider || CacheProvider.MEMORY,
    logService,
    supabase
  );
  const adminService = new AdminService(logService, cacheService, usuarioRepository, supabase);
  const adminController = new AdminController(adminService, logService);
  const cacheController = new CacheController(cacheManager, logService);

  // ===== ROTAS DE CATEGORIAS DE CONCURSOS =====
  router.post('/categorias-concursos', adminController.criarCategoriasConcursos.bind(adminController));
  router.get('/categorias-concursos', adminController.listarCategoriasConcursos.bind(adminController));
  router.put('/categorias-concursos/:id', adminController.atualizarCategoriasConcursos.bind(adminController));
  router.delete('/categorias-concursos/:id', adminController.excluirCategoriasConcursos.bind(adminController));

  // ===== ROTAS DE DISCIPLINAS POR CATEGORIA =====
  router.post('/disciplinas-categoria', adminController.criarDisciplinasCategoria.bind(adminController));
  router.get('/disciplinas-categoria', adminController.listarDisciplinasCategoria.bind(adminController));
  router.put('/disciplinas-categoria/:id', adminController.atualizarDisciplinasCategoria.bind(adminController));
  router.delete('/disciplinas-categoria/:id', adminController.excluirDisciplinasCategoria.bind(adminController));

  // ===== ROTAS DE CONCURSOS =====
  router.post('/concursos', adminController.criarConcurso.bind(adminController));
  router.get('/concursos', adminController.listarConcursos.bind(adminController));
  router.put('/concursos/:id', adminController.atualizarConcurso.bind(adminController));
  router.delete('/concursos/:id', adminController.excluirConcurso.bind(adminController));

  // ===== ROTAS DE SIMULADOS =====
  router.post('/simulados', adminController.criarSimulado.bind(adminController));
  router.get('/simulados', adminController.listarSimulados.bind(adminController));
  router.get('/simulados/:id', adminController.obterSimulado.bind(adminController));
  router.put('/simulados/:id', adminController.atualizarSimulado.bind(adminController));
  router.delete('/simulados/:id', adminController.excluirSimulado.bind(adminController));

  // ===== ROTAS DE QUESTÕES DE SIMULADOS =====
  router.post('/simulados/:simulado_id/questoes', adminController.adicionarQuestoesSimulado.bind(adminController));
  router.get('/simulados/:simulado_id/questoes', adminController.listarQuestoesSimulado.bind(adminController));
  router.put('/questoes-simulado/:id', adminController.atualizarQuestaoSimulado.bind(adminController));
  router.delete('/questoes-simulado/:id', adminController.excluirQuestaoSimulado.bind(adminController));

  // ===== ROTAS DE QUESTÕES SEMANAIS =====
  router.post('/questoes-semanais', adminController.criarQuestoesSemana.bind(adminController));
  router.get('/questoes-semanais', adminController.listarQuestoesSemana.bind(adminController));
  router.get('/questoes-semanais/:id', adminController.obterQuestoesSemana.bind(adminController));
  router.put('/questoes-semanais/:id', adminController.atualizarQuestoesSemana.bind(adminController));
  router.delete('/questoes-semanais/:id', adminController.excluirQuestoesSemana.bind(adminController));

  // ===== ROTAS DE FLASHCARDS =====
  router.post('/flashcards', adminController.criarFlashcards.bind(adminController));
  router.get('/flashcards', adminController.listarFlashcards.bind(adminController));
  router.get('/flashcards/:id', adminController.obterFlashcard.bind(adminController));
  router.put('/flashcards/:id', adminController.atualizarFlashcard.bind(adminController));
  router.delete('/flashcards/:id', adminController.excluirFlashcard.bind(adminController));

  // ===== ROTAS DE APOSTILAS =====
  router.post('/apostilas', adminController.criarApostila.bind(adminController));
  router.get('/apostilas', adminController.listarApostilas.bind(adminController));
  router.get('/apostilas/:id', adminController.obterApostila.bind(adminController));
  router.put('/apostilas/:id', adminController.atualizarApostila.bind(adminController));
  router.delete('/apostilas/:id', adminController.excluirApostila.bind(adminController));

  // ===== ROTAS DE CONTEÚDO DE APOSTILAS =====
  router.post('/apostilas/:apostila_id/conteudo', adminController.adicionarConteudoApostila.bind(adminController));
  router.get('/apostilas/:apostila_id/conteudo', adminController.listarConteudoApostila.bind(adminController));
  router.put('/conteudo-apostila/:id', adminController.atualizarConteudoApostila.bind(adminController));
  router.delete('/conteudo-apostila/:id', adminController.excluirConteudoApostila.bind(adminController));

  // ===== ROTAS DE MAPA DE ASSUNTOS =====
  router.post('/mapa-assuntos', adminController.criarMapaAssuntos.bind(adminController));
  router.get('/mapa-assuntos', adminController.listarMapaAssuntos.bind(adminController));
  router.put('/mapa-assuntos/:id', adminController.atualizarMapaAssuntos.bind(adminController));
  router.delete('/mapa-assuntos/:id', adminController.excluirMapaAssuntos.bind(adminController));

  // ===== GESTÃO DE USUÁRIOS (ADMIN) =====
  router.post('/usuarios/criar', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { nome, email, senha, role } = req.body;
      if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
      }
      // O admin só pode criar usuários comuns por padrão
      const usuarioRole = role === 'admin' ? 'user' : (role || 'user');
      // Criar hash da senha
      const saltRounds = 12;
      const senhaHash = await bcrypt.hash(senha, saltRounds);
      // Criar usuário
      const novoUsuario = await usuarioRepository.criar({
        nome,
        email,
        senha_hash: senhaHash,
        ativo: true,
        primeiro_login: true,
        role: usuarioRole,
        criado_em: new Date(),
        atualizado_em: new Date(),
        total_questoes_respondidas: 0,
        total_acertos: 0,
        tempo_estudo_minutos: 0,
        pontuacao_media: 0
      });
      res.json({ success: true, user: novoUsuario });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao criar usuário' });
    }
  });
  router.get('/usuarios', adminController.listarUsuarios.bind(adminController));
  router.get('/usuarios/:id', adminController.obterUsuario.bind(adminController));
  router.put('/usuarios/:id', adminController.atualizarUsuario.bind(adminController));
  router.patch('/usuarios/:id/ativar', adminController.ativarUsuario.bind(adminController));
  router.patch('/usuarios/:id/desativar', adminController.desativarUsuario.bind(adminController));

  // ===== ROTAS DE CONFIGURAÇÕES DE CACHE =====
  router.post('/configuracao-cache', adminController.criarConfiguracaoCache.bind(adminController));
  router.get('/configuracao-cache', adminController.listarConfiguracaoCache.bind(adminController));
  router.put('/configuracao-cache/:id', adminController.atualizarConfiguracaoCache.bind(adminController));
  router.delete('/configuracao-cache/:id', adminController.excluirConfiguracaoCache.bind(adminController));

  // ===== ROTAS DE OPERAÇÕES EM LOTE =====
  router.post('/importar/:tipo', adminController.importarDadosLote.bind(adminController));
  router.get('/exportar/:tipo', adminController.exportarDados.bind(adminController));

  // ===== ROTAS DE VALIDAÇÃO DE DADOS JSON =====
  router.post('/validar/simulado', adminController.validarJsonSimulado.bind(adminController));
  router.post('/validar/questoes-semanais', adminController.validarJsonQuestoesSemana.bind(adminController));
  router.post('/validar/apostila', adminController.validarJsonApostila.bind(adminController));

  // ===== ROTAS DE ESTATÍSTICAS E RELATÓRIOS =====
  router.get('/estatisticas', adminController.obterEstatisticasSistema.bind(adminController));
  router.get('/relatorio/conteudo', adminController.obterRelatorioConteudo.bind(adminController));
  router.get('/relatorio/usuarios', adminController.obterRelatorioUsuarios.bind(adminController));

  // ===== ROTAS DE SISTEMA E MANUTENÇÃO =====
  router.post('/testes', adminController.executarTestes.bind(adminController));
  router.post('/limpar-cache', adminController.limparCache.bind(adminController));
  router.get('/logs', adminController.obterLogs.bind(adminController));
  router.get('/metricas', adminController.obterMetricas.bind(adminController));
  router.post('/backup', adminController.executarBackup.bind(adminController));
  router.post('/restaurar-backup', adminController.restaurarBackup.bind(adminController));
  router.use('/benchmarks', benchmarksRoute);
  
  // ===== ROTAS DE CACHE AVANÇADO =====
  router.get('/cache/stats', cacheController.getStats.bind(cacheController));
  router.post('/cache/clear-all', cacheController.clearAll.bind(cacheController));
  router.post('/cache/clear-pattern', cacheController.clearByPattern.bind(cacheController));
  router.post('/cache/invalidate', cacheController.invalidateByEntity.bind(cacheController));
  router.get('/cache/config', cacheController.getConfig.bind(cacheController));

  return router;
}

export default createAdminRoutes;




