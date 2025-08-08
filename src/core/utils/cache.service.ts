// Serviço de cache para o AprovaFácil
import type { ICacheService, ILogService } from '../interfaces/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';

export class CacheService implements ICacheService {
  private readonly supabase: SupabaseClient;
  private readonly logService: ILogService;
  private readonly memoryCache: Map<string, { valor: unknown; expira: Date }>;
  private readonly configuracoes: Map<string, { ttl: number; descricao: string }>;

  constructor(supabase: SupabaseClient, logService: ILogService) {
    this.supabase = supabase;
    this.logService = logService;
    this.memoryCache = new Map();
    this.configuracoes = new Map();
    
    // Carregar configurações de cache
    void this.carregarConfiguracoes().catch(error => {
      this.logService.erro('Erro ao carregar configurações de cache', error as Error);
    });
    
    // Limpar cache expirado a cada 5 minutos
    setInterval(() => { 
      this.limparCacheExpirado(); 
    }, 5 * 60 * 1000);
  }

  async obter<T>(chave: string): Promise<T | null> {
    try {
      // Primeiro, verificar cache em memória
      const cacheMemoria = this.memoryCache.get(chave);
      if (cacheMemoria && cacheMemoria.expira > new Date()) {
        await this.logService.logarOperacaoCache('GET_MEMORY', chave, true);
        return cacheMemoria.valor as T;
      }

      // Se não encontrou em memória, verificar cache persistente
      try {
        const { data, error } = await this.supabase
          .from('cache_performance_usuario')
          .select('dados_cache, expira_em')
          .eq('chave_cache', chave)
          .gt('expira_em', new Date().toISOString())
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
          await this.logService.logarOperacaoCache('GET_PERSISTENT', chave, false);
          return null; // Retornar null em vez de lançar erro
        }

        if (data) {
          // Adicionar ao cache em memória para próximas consultas
          this.memoryCache.set(chave, {
            valor: data.dados_cache,
            expira: new Date(data.expira_em),
          });
          
          await this.logService.logarOperacaoCache('GET_PERSISTENT', chave, true);
          return data.dados_cache as T;
        }
      } catch {
        // Se há erro de banco (tabela não existe, etc.), apenas logar e continuar
        await this.logService.logarOperacaoCache('GET_PERSISTENT', chave, false);
      }

      await this.logService.logarOperacaoCache('GET', chave, false);
      return null;
    } catch (error) {
      await this.logService.erro('Erro ao obter cache', error as Error, { chave });
      return null;
    }
  }

  async definir<T>(chave: string, valor: T, ttlMinutos?: number): Promise<void> {
    try {
      const ttl = ttlMinutos ?? this.obterTTLPadrao(chave);
      const expiraEm = new Date();
      expiraEm.setMinutes(expiraEm.getMinutes() + ttl);

      // Salvar em cache de memória
      this.memoryCache.set(chave, {
        valor,
        expira: expiraEm,
      });

      // Salvar em cache persistente
      try {
        const { error } = await this.supabase
          .from('cache_performance_usuario')
          .upsert({
            chave_cache: chave,
            dados_cache: valor,
            expira_em: expiraEm.toISOString(),
            atualizado_em: new Date().toISOString(),
          });

        if (error) {
          await this.logService.logarOperacaoCache('SET', chave, false);
          // Não lançar erro, apenas logar
        } else {
          await this.logService.logarOperacaoCache('SET', chave, true);
        }
      } catch {
        // Se há erro de banco (tabela não existe, etc.), apenas logar e continuar
        await this.logService.logarOperacaoCache('SET', chave, false);
      }
    } catch (error) {
      await this.logService.erro('Erro ao definir cache', error as Error, { chave, ttl: ttlMinutos });
      throw error;
    }
  }

  async remover(chave: string): Promise<void> {
    try {
      // Remover do cache em memória
      this.memoryCache.delete(chave);

      // Remover do cache persistente
      try {
        const { error } = await this.supabase
          .from('cache_performance_usuario')
          .delete()
          .eq('chave_cache', chave);

        if (error) {
          await this.logService.logarOperacaoCache('DELETE', chave, false);
          // Não lançar erro, apenas logar
        } else {
          await this.logService.logarOperacaoCache('DELETE', chave, true);
        }
      } catch {
        // Se há erro de banco (tabela não existe, etc.), apenas logar e continuar
        await this.logService.logarOperacaoCache('DELETE', chave, false);
      }
    } catch (error) {
      await this.logService.erro('Erro ao remover cache', error as Error, { chave });
      throw error;
    }
  }

  async limpar(padrao?: string): Promise<void> {
    try {
      if (padrao) {
        // Limpar cache em memória por padrão
        for (const [chave] of this.memoryCache) {
          if (chave.includes(padrao)) {
            this.memoryCache.delete(chave);
          }
        }

        // Limpar cache persistente por padrão
        const { error } = await this.supabase
          .from('cache_performance_usuario')
          .delete()
          .ilike('chave_cache', `%${padrao}%`);

        if (error) {
          await this.logService.erro('Erro ao limpar cache por padrão', error as Error, { padrao });
          throw new Error('Failed to clear cache by pattern');
        }
      } else {
        // Limpar todo o cache
        this.memoryCache.clear();

        const { error } = await this.supabase
          .from('cache_performance_usuario')
          .delete()
          .neq('chave_cache', '');

        if (error) {
          await this.logService.erro('Erro ao limpar todo o cache', error as Error);
          throw new Error('Failed to clear all cache');
        }
      }

      await this.logService.logarOperacaoCache('CLEAR', padrao || 'ALL', true);
    } catch (error) {
      await this.logService.erro('Erro ao limpar cache', error as Error, { padrao });
      throw error;
    }
  }

  async limparPorPrefixo(prefixo: string): Promise<void> {
    try {
      // Limpar cache em memória por prefixo
      for (const [chave] of this.memoryCache) {
        if (chave.startsWith(prefixo)) {
          this.memoryCache.delete(chave);
        }
      }

      // Limpar cache persistente por prefixo
      const { error } = await this.supabase
        .from('cache_performance_usuario')
        .delete()
        .ilike('chave_cache', `${prefixo}%`);

      if (error) {
        await this.logService.erro('Erro ao limpar cache por prefixo', error as Error, { prefixo });
        throw new Error('Failed to clear cache by prefix');
      }

      await this.logService.logarOperacaoCache('CLEAR_PREFIX', prefixo, true);
    } catch (error) {
      await this.logService.erro('Erro ao limpar cache por prefixo', error as Error, { prefixo });
      throw error;
    }
  }

  async existe(chave: string): Promise<boolean> {
    try {
      // Verificar cache em memória
      const cacheMemoria = this.memoryCache.get(chave);
      if (cacheMemoria && cacheMemoria.expira > new Date()) {
        return true;
      }

      // Verificar cache persistente
      const { data, error } = await this.supabase
        .from('cache_performance_usuario')
        .select('id')
        .eq('chave_cache', chave)
        .gt('expira_em', new Date().toISOString())
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error('Failed to check cache existence'); // Assuming CacheError is removed, use a generic error
      }

      return !!data;
    } catch (error) {
      await this.logService.erro('Erro ao verificar existência no cache', error as Error, { chave });
      return false;
    }
  }

  // Métodos específicos para diferentes tipos de cache
  async obterProgressoUsuario(usuarioId: string): Promise<unknown> {
    return this.obter(`progresso_usuario:${usuarioId}`);
  }

  async definirProgressoUsuario(usuarioId: string, progresso: unknown): Promise<void> {
    return this.definir(`progresso_usuario:${usuarioId}`, progresso, 60);
  }

  async obterResultadoSimulado(usuarioId: string, simuladoId: string): Promise<unknown> {
    return this.obter(`resultado_simulado:${usuarioId}:${simuladoId}`);
  }

  async definirResultadoSimulado(usuarioId: string, simuladoId: string, resultado: unknown): Promise<void> {
    return this.definir(`resultado_simulado:${usuarioId}:${simuladoId}`, resultado, 120);
  }

  async obterQuestoesSemana(ano: number, semana: number): Promise<unknown> {
    return this.obter(`questoes_semana:${ano}:${semana}`);
  }

  async definirQuestoesSemana(ano: number, semana: number, questoes: unknown): Promise<void> {
    return this.definir(`questoes_semana:${ano}:${semana}`, questoes, 1440); // 24 horas
  }

  async obterConteudoApostila(apostilaId: string): Promise<unknown> {
    return this.obter(`conteudo_apostila:${apostilaId}`);
  }

  async definirConteudoApostila(apostilaId: string, conteudo: unknown): Promise<void> {
    return this.definir(`conteudo_apostila:${apostilaId}`, conteudo, 2880); // 48 horas
  }

  async obterPlanoEstudo(usuarioId: string): Promise<unknown> {
    return this.obter(`plano_estudo:${usuarioId}`);
  }

  async definirPlanoEstudo(usuarioId: string, plano: unknown): Promise<void> {
    return this.definir(`plano_estudo:${usuarioId}`, plano, 60);
  }

  // Métodos utilitários
  private async carregarConfiguracoes(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('configuracao_cache')
        .select('chave_cache, ttl_minutos, descricao');

      if (error) {
        await this.logService.erro('Erro ao carregar configurações de cache', error as Error);
        return;
      }

      if (data) {
        data.forEach(config => {
          this.configuracoes.set(config.chave_cache, {
            ttl: config.ttl_minutos,
            descricao: config.descricao ?? '',
          });
        });
      }

      await this.logService.info(`Configurações de cache carregadas: ${this.configuracoes.size} configurações`);
    } catch (error) {
      await this.logService.erro('Erro ao carregar configurações de cache', error as Error);
    }
  }

  private obterTTLPadrao(chave: string): number {
    // Verificar se há configuração específica para esta chave
    const config = this.configuracoes.get(chave);
    if (config) {
      return config.ttl;
    }

    // Verificar padrões de chave
    if (chave.startsWith('progresso_usuario:')) {
      return 60; // 1 hora
    }
    if (chave.startsWith('resultado_simulado:')) {
      return 120; // 2 horas
    }
    if (chave.startsWith('questoes_semana:')) {
      return 1440; // 24 horas
    }
    if (chave.startsWith('conteudo_apostila:')) {
      return 2880; // 48 horas
    }
    if (chave.startsWith('plano_estudo:')) {
      return 1440; // 24 horas
    }

    return 30; // Padrão: 30 minutos
  }

  private limparCacheExpirado(): void {
    const agora = new Date();
    const chavesExpiradas: string[] = [];

    for (const [chave, cache] of this.memoryCache.entries()) {
      if (cache.expira <= agora) {
        this.memoryCache.delete(chave);
        chavesExpiradas.push(chave);
      }
    }

    if (chavesExpiradas.length > 0) {
      this.logService.debug(`Cache em memória limpo: ${chavesExpiradas.length} chaves expiradas removidas`);
    }
  }

  // Método para obter estatísticas do cache
  async obterEstatisticas(): Promise<{
    cache_memoria: {
      total_chaves: number;
      chaves_expiradas: number;
      uso_memoria_mb: number;
    };
    cache_persistente: {
      total_registros: number;
      registros_expirados: number;
      ultimo_acesso: Date | null;
    };
  }> {
    try {
      // Estatísticas do cache em memória
      const chavesMemoria = Array.from(this.memoryCache.keys());
      const chavesExpiradas = chavesMemoria.filter(chave => {
        const cache = this.memoryCache.get(chave);
        return cache ? cache.expira <= new Date() : false;
      });

      // Calcular uso de memória (aproximado)
      const usoMemoria = chavesMemoria.length * 1024; // 1KB por chave (aproximado)

      // Estatísticas do cache persistente
      let totalRegistros = 0;
      let registrosExpirados = 0;
      let ultimoAcesso: Date | null = null;

      try {
        const { data: registros } = await this.supabase
          .from('cache_performance_usuario')
          .select('expira_em, atualizado_em');

        if (registros) {
          totalRegistros = registros.length;
          registrosExpirados = registros.filter(reg => new Date(reg.expira_em) <= new Date()).length;
          
          if (registros.length > 0) {
            const ultimaAtualizacao = registros.reduce((maisRecente, reg) => {
              const data = new Date(reg.atualizado_em ?? '');
              return data > maisRecente ? data : maisRecente;
            }, new Date(0));
            
            ultimoAcesso = ultimaAtualizacao > new Date(0) ? ultimaAtualizacao : null;
          }
        }
      } catch {
        // Se há erro de banco, apenas continuar com valores padrão
      }

      return {
        cache_memoria: {
          total_chaves: chavesMemoria.length,
          chaves_expiradas: chavesExpiradas.length,
          uso_memoria_mb: Math.round(usoMemoria / 1024 / 1024 * 100) / 100,
        },
        cache_persistente: {
          total_registros: totalRegistros,
          registros_expirados: registrosExpirados,
          ultimo_acesso: ultimoAcesso,
        },
      };
    } catch (error) {
      await this.logService.erro('Erro ao obter estatísticas de cache', error as Error);
      return {
        cache_memoria: {
          total_chaves: 0,
          chaves_expiradas: 0,
          uso_memoria_mb: 0,
        },
        cache_persistente: {
          total_registros: 0,
          registros_expirados: 0,
          ultimo_acesso: null,
        },
      };
    }
  }

  // Método para limpar cache expirado do banco
  async limparCacheExpiradoBanco(): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('cache_performance_usuario')
        .delete()
        .lt('expira_em', new Date().toISOString())
        .select('count');

      if (error) {
        await this.logService.erro('Erro ao limpar cache expirado no banco', error as Error);
        return 0;
      }

      return count ?? 0;
    } catch (error) {
      await this.logService.erro('Erro ao limpar cache expirado no banco', error as Error);
      return 0;
    }
  }
}

export default CacheService;




