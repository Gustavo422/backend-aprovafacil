import type { ApiResponse } from '../../../../shared/types/index.js';
import type { AdminContext } from '../../context.js';
import { gerarSlug } from '../../utils/slug.js';

export class SimuladosAdminService {
  private readonly ctx: AdminContext;

  constructor(context: AdminContext) {
    this.ctx = context;
  }

  async criarSimulado(dados: {
    titulo: string;
    descricao?: string;
    concurso_id: string;
    numero_questoes: number;
    tempo_minutos: number;
    dificuldade: 'facil' | 'medio' | 'dificil';
    questoes: Array<{
      enunciado: string;
      alternativas: string[];
      resposta_correta: string;
      explicacao?: string;
      disciplina?: string;
      assunto?: string;
      dificuldade?: string;
    }>;
  }): Promise<ApiResponse<unknown>> {
    try {
      await this.ctx.logService.logarInicioOperacao('criarSimulado', { titulo: dados.titulo });

      const slug = gerarSlug(dados.titulo);
      const { data: simulado, error: erroSimulado } = await this.ctx.supabase
        .from('simulados')
        .insert({
          titulo: dados.titulo,
          slug,
          descricao: dados.descricao,
          concurso_id: dados.concurso_id,
          numero_questoes: dados.numero_questoes,
          tempo_minutos: dados.tempo_minutos,
          dificuldade: dados.dificuldade,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .select()
        .single();

      if (erroSimulado) throw erroSimulado;
      if (!simulado) throw new Error('Erro ao criar simulado');

      if (dados.questoes && dados.questoes.length > 0) {
        const questoesFormatadas = dados.questoes.map((questao, index) => ({
          simulado_id: simulado.id,
          numero_questao: index + 1,
          enunciado: questao.enunciado,
          alternativas: questao.alternativas,
          resposta_correta: questao.resposta_correta,
          explicacao: questao.explicacao,
          disciplina: questao.disciplina,
          assunto: questao.assunto,
          dificuldade: questao.dificuldade ?? dados.dificuldade,
          ordem: index + 1,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        }));

        const { error: erroQuestoes } = await this.ctx.supabase
          .from('questoes_simulado')
          .insert(questoesFormatadas);

        if (erroQuestoes) {
          if (simulado.id) await this.ctx.supabase.from('simulados').delete().eq('id', simulado.id);
          throw erroQuestoes;
        }
      }

      await this.ctx.logService.logarCriacaoConteudo('simulado', String(simulado.id));
      await this.ctx.logService.logarFimOperacao('criarSimulado', true);
      return { success: true, data: simulado, message: 'Simulado criado com sucesso' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao criar simulado', error as Error, { dados });
      throw error;
    }
  }

  async listarSimulados(filtro?: { concurso_id?: string; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.ctx.supabase
        .from('simulados')
        .select('id, titulo, slug, descricao, concurso_id, numero_questoes, tempo_minutos, dificuldade, publico, ativo, criado_em, atualizado_em');

      if (filtro?.concurso_id) query = query.eq('concurso_id', filtro.concurso_id);
      if (filtro?.ativo !== undefined) query = query.eq('ativo', filtro.ativo);

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data, message: 'Simulados listados' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao listar simulados', error as Error);
      throw error;
    }
  }

  async obterSimulado(id: string): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('simulados')
        .select(`
          id, titulo, slug, descricao, concurso_id, categoria_id, numero_questoes, tempo_minutos, dificuldade, publico, ativo, criado_em, atualizado_em,
          concursos (nome, slug),
          questoes_simulado (id, simulado_id, numero_questao, enunciado, alternativas, resposta_correta, explicacao, disciplina, assunto, dificuldade, ordem, peso_disciplina, criado_em, atualizado_em)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Simulado obtido' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao obter simulado', error as Error, { id });
      throw error;
    }
  }

  async atualizarSimulado(id: string, dados: { titulo?: string; descricao?: string; concurso_id?: string; numero_questoes?: number; tempo_minutos?: number; dificuldade?: 'facil' | 'medio' | 'dificil'; ativo?: boolean }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('simulados')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Simulado atualizado' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao atualizar simulado', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirSimulado(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.ctx.supabase
        .from('simulados')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true, data: true, message: 'Simulado excluído' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao excluir simulado', error as Error, { id });
      throw error;
    }
  }

  async adicionarQuestoesSimulado(simuladoId: string, questoes: Array<{ numero_questao: number; enunciado: string; alternativas: string[]; resposta_correta: string; explicacao?: string; disciplina?: string; assunto?: string; dificuldade?: string; ordem?: number }>): Promise<ApiResponse<unknown>> {
    try {
      const questoesFormatadas = questoes.map((questao, index) => ({
        simulado_id: simuladoId,
        numero_questao: questao.numero_questao ?? index + 1,
        enunciado: questao.enunciado,
        alternativas: questao.alternativas,
        resposta_correta: questao.resposta_correta,
        explicacao: questao.explicacao,
        disciplina: questao.disciplina,
        assunto: questao.assunto,
        dificuldade: questao.dificuldade,
        ordem: questao.ordem ?? index + 1,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      }));

      const { data, error } = await this.ctx.supabase
        .from('questoes_simulado')
        .insert(questoesFormatadas)
        .select();

      if (error) throw error;
      return { success: true, data, message: `${data.length} questões adicionadas` };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao adicionar questões', error as Error, { simuladoId });
      throw error;
    }
  }

  async listarQuestoesSimulado(simuladoId: string, filtro?: { dificuldade?: string; disciplina?: string }): Promise<ApiResponse<unknown>> {
    try {
      let query = this.ctx.supabase
        .from('questoes_simulado')
        .select('id, simulado_id, numero_questao, enunciado, alternativas, resposta_correta, explicacao, disciplina, assunto, dificuldade, ordem, peso_disciplina, criado_em, atualizado_em')
        .eq('simulado_id', simuladoId)
        .order('ordem', { ascending: true });

      if (filtro?.dificuldade) query = query.eq('dificuldade', filtro.dificuldade);
      if (filtro?.disciplina) query = query.eq('disciplina', filtro.disciplina);

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data, message: 'Questões listadas' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao listar questões', error as Error, { simuladoId });
      throw error;
    }
  }

  async atualizarQuestaoSimulado(id: string, dados: { enunciado?: string; alternativas?: string[]; resposta_correta?: string; explicacao?: string; disciplina?: string; assunto?: string; dificuldade?: string; ordem?: number }): Promise<ApiResponse<unknown>> {
    try {
      const { data, error } = await this.ctx.supabase
        .from('questoes_simulado')
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data, message: 'Questão atualizada' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao atualizar questão', error as Error, { id, dados });
      throw error;
    }
  }

  async excluirQuestaoSimulado(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.ctx.supabase
        .from('questoes_simulado')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true, data: true, message: 'Questão excluída' };
    } catch (error) {
      await this.ctx.logService.erro('Erro ao excluir questão', error as Error, { id });
      throw error;
    }
  }
}

export default SimuladosAdminService;


