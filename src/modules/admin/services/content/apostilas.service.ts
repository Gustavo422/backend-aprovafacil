import type { ApiResponse } from '../../../../shared/types/index.js';
import type { AdminContext } from '../../context.js';
import { gerarSlug } from '../../utils/slug.js';

export class ApostilasAdminService {
  private readonly ctx: AdminContext;

  constructor(context: AdminContext) {
    this.ctx = context;
  }

  async criarApostila(dados: { titulo: string; descricao?: string; concurso_id: string; conteudo: Array<{ numero_modulo: number; titulo: string; conteudo_json: unknown }> }): Promise<ApiResponse<unknown>> {
    try {
      await this.ctx.logService.logarInicioOperacao('criarApostila', { titulo: dados.titulo });
      const slug = gerarSlug(dados.titulo);
      const { data: apostila, error: erroApostila } = await this.ctx.supabase
        .from('apostilas')
        .insert({ titulo: dados.titulo, slug, descricao: dados.descricao, concurso_id: dados.concurso_id, criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
        .select()
        .single();
      if (erroApostila) throw erroApostila;
      if (!apostila) throw new Error('Erro ao criar apostila');

      if (dados.conteudo && dados.conteudo.length > 0) {
        const conteudoFormatado = dados.conteudo.map(modulo => ({ apostila_id: apostila.id, concurso_id: dados.concurso_id, numero_modulo: modulo.numero_modulo, titulo: modulo.titulo, conteudo_json: modulo.conteudo_json, criado_em: new Date().toISOString() }));
        const { error: erroConteudo } = await this.ctx.supabase.from('conteudo_apostila').insert(conteudoFormatado);
        if (erroConteudo) {
          if (apostila?.id) await this.ctx.supabase.from('apostilas').delete().eq('id', apostila.id);
          throw erroConteudo;
        }
      }
      await this.ctx.logService.logarCriacaoConteudo('apostila', String(apostila.id));
      await this.ctx.logService.logarFimOperacao('criarApostila', true);
      return { success: true, data: apostila, message: 'Apostila criada com sucesso' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao criar apostila', error as Error, { dados });
      throw error;
    }
  }

  async listarApostilas(filtro?: { concurso_id?: string; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.ctx.supabase.from('apostilas').select('*');
      if (filtro?.concurso_id) query = query.eq('concurso_id', filtro.concurso_id);
      if (filtro?.ativo !== undefined) query = query.eq('ativo', filtro.ativo);
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data, message: 'Apostilas listadas' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao listar apostilas', error as Error);
      throw error;
    }
  }

  async obterApostila(id: string): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('apostilas')
        .select(`*, concursos (nome, slug), conteudo_apostila (*)`)
        .eq('id', id)
        .single();
      if (error) throw error;
      return { success: true, data, message: 'Apostila obtida' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao obter apostila', error as Error, { id });
      throw error;
    }
  }

  async atualizarApostila(id: string, dados: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('apostilas')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data, message: 'Apostila atualizada' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao atualizar apostila', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirApostila(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.ctx.supabase
        .from('apostilas')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true, data: true, message: 'Apostila excluída' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao excluir apostila', error as Error, { id });
      throw error;
    }
  }

  async adicionarConteudoApostila(apostilaId: string, conteudo: Array<{ numero_modulo: number; titulo: string; conteudo_json: unknown }>): Promise<ApiResponse<unknown>> {
    try {
      const conteudoFormatado = conteudo.map(modulo => ({ apostila_id: apostilaId, numero_modulo: modulo.numero_modulo, titulo: modulo.titulo, conteudo_json: modulo.conteudo_json, criado_em: new Date().toISOString() }));
      const { data, error } = await this.ctx.supabase.from('conteudo_apostila').insert(conteudoFormatado).select();
      if (error) throw error;
      return { success: true, data, message: `${data.length} módulos adicionados` };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao adicionar conteúdo', error as Error, { apostilaId });
      throw error;
    }
  }

  async listarConteudoApostila(apostilaId: string): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('conteudo_apostila')
        .select('*')
        .eq('apostila_id', apostilaId)
        .order('numero_modulo', { ascending: true });
      if (error) throw error;
      return { success: true, data, message: 'Conteúdo listado' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao listar conteúdo', error as Error, { apostilaId });
      throw error;
    }
  }

  async atualizarConteudoApostila(id: string, dados: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('conteudo_apostila')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data, message: 'Conteúdo atualizado' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao atualizar conteúdo', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirConteudoApostila(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.ctx.supabase
        .from('conteudo_apostila')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true, data: true, message: 'Conteúdo excluído' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao excluir conteúdo', error as Error, { id });
      throw error;
    }
  }
}

export default ApostilasAdminService;


