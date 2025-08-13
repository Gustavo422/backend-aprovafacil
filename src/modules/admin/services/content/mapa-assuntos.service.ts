import type { ApiResponse } from '../../../../shared/types/index.js';
import type { AdminContext } from '../../context.js';

export class MapaAssuntosAdminService {
  private readonly ctx: AdminContext;

  constructor(context: AdminContext) {
    this.ctx = context;
  }

  async criarMapaAssuntos(dados: { concurso_id: string; disciplina: string; assunto: string; subassunto?: string; peso?: number; dificuldade?: string }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('mapa_assuntos')
        .insert({ ...dados, ativo: true, criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      await this.ctx.logService.logarCriacaoConteudo('mapa_assuntos', String(data.id));
      return { success: true, data, message: 'Mapa de assuntos criado' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao criar mapa de assuntos', error as Error, { dados });
      throw error;
    }
  }

  async listarMapaAssuntos(): Promise<ApiResponse<unknown>> {
    try {
      const query = this.ctx.supabase
        .from('mapa_assuntos')
        .select('*, concursos (nome, slug)')
        .order('disciplina', { ascending: true })
        .order('assunto', { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data, message: 'Mapa de assuntos listado' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao listar mapa de assuntos', error as Error);
      throw error;
    }
  }

  async atualizarMapaAssuntos(id: string, dados: { concurso_id?: string; disciplina?: string; assunto?: string; subassunto?: string; peso?: number; dificuldade?: string }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('mapa_assuntos')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data, message: 'Mapa de assuntos atualizado' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao atualizar mapa de assuntos', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirMapaAssuntos(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.ctx.supabase
        .from('mapa_assuntos')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true, data: true, message: 'Mapa de assuntos excluído' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao excluir mapa de assuntos', error as Error, { id });
      throw error;
    }
  }
}

export default MapaAssuntosAdminService;


