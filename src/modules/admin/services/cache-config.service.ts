import type { ApiResponse } from '../../../shared/types/index.js';
import type { AdminContext } from '../context.js';

export class CacheAdminService {
  private readonly ctx: AdminContext;

  constructor(context: AdminContext) {
    this.ctx = context;
  }

  async limparCache(): Promise<ApiResponse<boolean>> {
    try {
      await this.ctx.logService.logarInicioOperacao('limparCacheAdmin');
      await this.ctx.cacheService.limpar();
      const registrosRemovidos = await this.ctx.cacheService.limparCacheExpiradoBanco();
      await this.ctx.logService.info('Cache limpo pelo administrador', { registros_removidos: registrosRemovidos });
      await this.ctx.logService.logarFimOperacao('limparCacheAdmin', true);
      return { success: true, data: true, message: `Cache limpo com sucesso. ${registrosRemovidos} registros expirados removidos.` };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao limpar cache', error as Error);
      throw error;
    }
  }

  async criarConfiguracaoCache(dados: { chave: string; tempo_expiracao_minutos: number; ativo: boolean; descricao?: string }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('configuracao_cache')
        .insert({ ...dados, criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      if (data?.id) await this.ctx.logService.logarCriacaoConteudo('configuracao_cache', data.id);
      return { success: true, data, message: 'Configuração de cache criada' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao criar configuração de cache', error as Error, { dados });
      throw error;
    }
  }

  async listarConfiguracaoCache(): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('configuracao_cache')
        .select('*')
        .order('chave', { ascending: true });
      if (error) throw error;
      return { success: true, data, message: 'Configurações de cache listadas' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao listar configurações de cache', error as Error);
      throw error;
    }
  }

  async atualizarConfiguracaoCache(id: string, dados: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('configuracao_cache')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data, message: 'Configuração de cache atualizada' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao atualizar configuração de cache', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirConfiguracaoCache(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.ctx.supabase
        .from('configuracao_cache')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true, data: true, message: 'Configuração de cache excluída' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao excluir configuração de cache', error as Error, { id });
      throw error;
    }
  }
}

export default CacheAdminService;


