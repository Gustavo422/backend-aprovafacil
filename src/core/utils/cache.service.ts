// Serviço de cache para o AprovaFácil
import { ICacheService, ILogService } from '../interfaces/index.js';
import { SupabaseClient } from '@supabase/supabase-js';

export class CacheService implements ICacheService {
  private supabase: SupabaseClient;
  private logService: ILogService;
  private memoryCache: Map<string, { valor: unknown; expira: Date }>;
  private configuracoes: Map<string, { ttl: number; descricao: string }>;

  constructor(supabase: SupabaseClient, logService: ILogService) {
    this.supabase = supabase;
    this.logService = logService;
    this.memoryCache = new Map();
    this.configuracoes = new Map();
    
    // Carregar configurações de cache
    this.carregarConfiguracoes();
    
    // Limpar cache expirado a cada 5 minutos
    setInterval(() => this.limparCacheExpirado(), 5 * 60 * 1000);
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
          .from('cache_performance_usuario_usuario_usuario_usuario')
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
             } catch (dbError) {
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
      const ttl = ttlMinutos || this.obterTTLPadrao(chave);
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
          .from('cache_performance_usuario_usuario_usuario_usuario')
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
      } catch (dbError) {
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
          .from('cache_performance_usuario_usuario_usuario_usuario')
          .delete()
          .eq('chave_cache', chave);

        if (error) {
          await this.logService.logarOperacaoCache('DELETE', chave, false);
          // Não lançar erro, apenas logar
        } else {
          await this.logService.logarOperacaoCache('DELETE', chave, true);
        }
      } catch (dbError) {
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
          .from('cache_performance_usuario_usuario_usuario_usuario')
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
          .from('cache_performance_usuario_usuario_usuario_usuario')
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
        .from('cache_performance_usuario_usuario_usuario_usuario')
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
        .from('cache_performance_usuario_usuario_usuario_usuario')
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
    return this.obter(`progresso_usuario_${usuarioId}`);
  }

  async definirProgressoUsuario(usuarioId: string, progresso: unknown): Promise<void> {
    await this.definir(`progresso_usuario_${usuarioId}`, progresso);
  }

  async obterResultadoSimulado(usuarioId: string, simuladoId: string): Promise<unknown> {
    return this.obter(`resultado_simulado_${usuarioId}_${simuladoId}`);
  }

  async definirResultadoSimulado(usuarioId: string, simuladoId: string, resultado: unknown): Promise<void> {
    await this.definir(`resultado_simulado_${usuarioId}_${simuladoId}`, resultado);
  }

  async obterQuestoesSemana(ano: number, semana: number): Promise<unknown> {
    return this.obter(`questoes_semana_${ano}_${semana}`);
  }

  async definirQuestoesSemana(ano: number, semana: number, questoes: unknown): Promise<void> {
    await this.definir(`questoes_semana_${ano}_${semana}`, questoes);
  }

  async obterConteudoApostila(apostilaId: string): Promise<unknown> {
    return this.obter(`conteudo_apostila_${apostilaId}`);
  }

  async definirConteudoApostila(apostilaId: string, conteudo: unknown): Promise<void> {
    await this.definir(`conteudo_apostila_${apostilaId}`, conteudo);
  }

  async obterPlanoEstudo(usuarioId: string): Promise<unknown> {
    return this.obter(`plano_estudo_${usuarioId}`);
  }

  async definirPlanoEstudo(usuarioId: string, plano: unknown): Promise<void> {
    await this.definir(`plano_estudo_${usuarioId}`, plano);
  }

  // Métodos utilitários
  private async carregarConfiguracoes(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('configuracao_cache')
        .select('chave_cache, ttl_minutos, descricao');

      if (error) {
        await this.logService.aviso('Erro ao carregar configurações de cache', error);
        return;
      }

      if (data) {
        data.forEach(config => {
          this.configuracoes.set(config.chave_cache, {
            ttl: config.ttl_minutos,
            descricao: config.descricao || '',
          });
        });
      }

      await this.logService.info(`Configurações de cache carregadas: ${this.configuracoes.size} configurações`);
    } catch (error) {
      await this.logService.erro('Erro ao carregar configurações de cache', error as Error);
    }
  }

  private obterTTLPadrao(chave: string): number {
    // Verificar configurações específicas
    for (const [padraoChave, config] of this.configuracoes.entries()) {
      if (chave.includes(padraoChave)) {
        return config.ttl;
      }
    }

    // TTL padrão baseado no tipo de chave
    if (chave.includes('progresso_usuario')) return 30;
    if (chave.includes('resultado_simulado')) return 60;
    if (chave.includes('questoes_semana')) return 1440;
    if (chave.includes('conteudo_apostila')) return 240;
    if (chave.includes('plano_estudo')) return 120;
    if (chave.includes('flashcard_progress')) return 15;

    return 60; // 1 hora por padrão
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
      const agora = new Date();
      let chavesExpiradas = 0;
      
      for (const cache of this.memoryCache.values()) {
        if (cache.expira <= agora) {
          chavesExpiradas++;
        }
      }

      const usoMemoria = JSON.stringify([...this.memoryCache.entries()]).length / (1024 * 1024);

      // Estatísticas do cache persistente
      const { count: totalCount } = await this.supabase
        .from('cache_performance_usuario_usuario_usuario_usuario')
        .select('id', { count: 'exact', head: true });

      const { count: expiradosCount } = await this.supabase
        .from('cache_performance_usuario_usuario_usuario_usuario')
        .select('id', { count: 'exact', head: true })
        .lt('expira_em', new Date().toISOString());

      const { data: ultimoAcessoData } = await this.supabase
        .from('cache_performance_usuario_usuario_usuario_usuario')
        .select('atualizado_em')
        .order('atualizado_em', { ascending: false })
        .limit(1);

      return {
        cache_memoria: {
          total_chaves: this.memoryCache.size,
          chaves_expiradas: chavesExpiradas,
          uso_memoria_mb: Math.round(usoMemoria * 100) / 100,
        },
        cache_persistente: {
          total_registros: totalCount || 0,
          registros_expirados: expiradosCount || 0,
          ultimo_acesso: ultimoAcessoData?.[0]?.atualizado_em ? 
            new Date(ultimoAcessoData[0].atualizado_em) : null,
        },
      };
    } catch (error) {
      await this.logService.erro('Erro ao obter estatísticas do cache', error as Error);
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
      const { data, error } = await this.supabase
        .from('cache_performance_usuario_usuario_usuario_usuario')
        .delete()
        .lt('expira_em', new Date().toISOString());

      if (error) {
        throw new Error('Failed to clear expired cache'); // Assuming CacheError is removed, use a generic error
      }

      if (!data || !Array.isArray(data)) {
        return 0;
      }
      const registrosRemovidos = (data as unknown[]).length;
      await this.logService.info(`Cache expirado limpo: ${registrosRemovidos} registros removidos`);
      
      return registrosRemovidos;
    } catch (error) {
      await this.logService.erro('Erro ao limpar cache expirado do banco', error as Error);
      return 0;
    }
  }
}

export default CacheService;




