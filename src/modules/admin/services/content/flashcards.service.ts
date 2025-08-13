import type { ApiResponse } from '../../../../shared/types/index.js';
import type { AdminContext } from '../../context.js';

export class FlashcardsAdminService {
  private readonly ctx: AdminContext;

  constructor(context: AdminContext) {
    this.ctx = context;
  }

  async criarFlashcards(dados: { concurso_id: string; flashcards: Array<{ frente: string; verso: string; disciplina: string; tema: string; subtema?: string }> }): Promise<ApiResponse<unknown>> {
    try {
      await this.ctx.logService.logarInicioOperacao('criarFlashcards', { concurso_id: dados.concurso_id, quantidade: dados.flashcards.length });
      const flashcardsFormatados = dados.flashcards.map(flashcard => ({
        ...flashcard,
        concurso_id: dados.concurso_id,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      }));
      const { data, error } = await this.ctx.supabase.from('cartoes_memorizacao').insert(flashcardsFormatados).select();
      if (error) throw error;
      await this.ctx.logService.logarCriacaoConteudo('flashcards', String((data ?? []).length));
      await this.ctx.logService.logarFimOperacao('criarFlashcards', true);
      return { success: true, data, message: `${data?.length ?? 0} flashcards criados com sucesso` };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao criar flashcards', error as Error, { dados });
      throw error;
    }
  }

  async listarFlashcards(filtro?: { concurso_id?: string; disciplina?: string; tema?: string; subtema?: string }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.ctx.supabase
        .from('cartoes_memorizacao')
        .select(`*, concursos (nome, slug)`) // relação
        .order('criado_em', { ascending: false });

      if (filtro?.concurso_id) query = query.eq('concurso_id', filtro.concurso_id);
      if (filtro?.disciplina) query = query.eq('disciplina', filtro.disciplina);
      if (filtro?.tema) query = query.eq('tema', filtro.tema);
      if (filtro?.subtema) query = query.eq('subtema', filtro.subtema);

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data, message: 'Flashcards listados' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao listar flashcards', error as Error);
      throw error;
    }
  }

  async obterFlashcard(id: string): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('cartoes_memorizacao')
        .select(`*, concursos (nome, slug)`) // relação
        .eq('id', id)
        .single();
      if (error) throw error;
      return { success: true, data, message: 'Flashcard obtido' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao obter flashcard', error as Error, { id });
      throw error;
    }
  }

  async atualizarFlashcard(id: string, dados: { concurso_id?: string; frente?: string; verso?: string; disciplina?: string; tema?: string; subtema?: string }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('cartoes_memorizacao')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data, message: 'Flashcard atualizado' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao atualizar flashcard', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirFlashcard(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.ctx.supabase
        .from('cartoes_memorizacao')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true, data: true, message: 'Flashcard excluído' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao excluir flashcard', error as Error, { id });
      throw error;
    }
  }
}

export default FlashcardsAdminService;


