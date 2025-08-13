import type { ApiResponse } from '../../../../shared/types/index.js';
import type { AdminContext } from '../../context.js';

export class WeeklyQuestionsAdminService {
  private readonly ctx: AdminContext;

  constructor(context: AdminContext) {
    this.ctx = context;
  }

  async criarQuestoesSemana(dados: {
    titulo: string;
    numero_semana: number;
    ano: number;
    concurso_id: string;
    questoes: Array<{ enunciado: string; alternativas: string[]; resposta_correta: string; explicacao?: string; disciplina?: string; assunto?: string; dificuldade?: string }>;
    disciplina?: string;
    assunto?: string;
  }): Promise<ApiResponse<unknown>> {
    try {
      await this.ctx.logService.logarInicioOperacao('criarQuestoesSemana', { titulo: dados.titulo, semana: dados.numero_semana, ano: dados.ano });
      const { data, error } = await this.ctx.supabase
        .from('questoes_semanais')
        .insert({ ...dados, questoes: dados.questoes, criado_em: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      await this.ctx.logService.logarCriacaoConteudo('questoes_semanais', String(data.id));
      await this.ctx.logService.logarFimOperacao('criarQuestoesSemana', true);
      return { success: true, data, message: 'Questões semanais criadas com sucesso' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao criar questões semanais', error as Error, { dados });
      throw error;
    }
  }

  async listarQuestoesSemana(filtro?: { concurso_id?: string; ano?: number; numero_semana?: number; disciplina?: string; assunto?: string }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.ctx.supabase
        .from('questoes_semanais')
        .select(`*, concursos (nome, slug)`) // relação
        .order('ano', { ascending: false })
        .order('numero_semana', { ascending: false });

      if (filtro?.concurso_id) query = query.eq('concurso_id', filtro.concurso_id);
      if (filtro?.ano) query = query.eq('ano', filtro.ano);
      if (filtro?.numero_semana) query = query.eq('numero_semana', filtro.numero_semana);
      if (filtro?.disciplina) query = query.eq('disciplina', filtro.disciplina);
      if (filtro?.assunto) query = query.eq('assunto', filtro.assunto);

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data, message: 'Questões semanais listadas' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao listar questões semanais', error as Error);
      throw error;
    }
  }

  async obterQuestoesSemana(id: string): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('questoes_semanais')
        .select(`*, concursos (nome, slug)`) // relação
        .eq('id', id)
        .single();
      if (error) throw error;
      return { success: true, data, message: 'Questões semanais obtidas' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao obter questões semanais', error as Error, { id });
      throw error;
    }
  }

  async atualizarQuestoesSemana(id: string, dados: { concurso_id?: string; ano?: number; numero_semana?: number; titulo?: string; questoes?: Array<{ enunciado: string; alternativas: string[]; resposta_correta: string; explicacao?: string; disciplina?: string; assunto?: string; dificuldade?: string }>; disciplina?: string; assunto?: string }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('questoes_semanais')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data, message: 'Questões semanais atualizadas' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao atualizar questões semanais', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirQuestoesSemana(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.ctx.supabase
        .from('questoes_semanais')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true, data: true, message: 'Questões semanais excluídas' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao excluir questões semanais', error as Error, { id });
      throw error;
    }
  }
}

export default WeeklyQuestionsAdminService;