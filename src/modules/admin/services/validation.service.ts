import type { ApiResponse } from '../../../shared/types/index.js';

export class ValidationAdminService {
  validarJsonSimulado(dados: { titulo?: string; concurso_id?: string; questoes?: Array<{ enunciado?: string; alternativas?: unknown[]; resposta_correta?: string }> }): ApiResponse<{ valido: boolean; erros: string[] }> {
    try {
      const erros: string[] = [];
      if (!dados.titulo) erros.push('Título é obrigatório');
      if (!dados.concurso_id) erros.push('Concurso é obrigatório');
      if (!dados.questoes || !Array.isArray(dados.questoes)) erros.push('Questões devem ser um array');
      dados.questoes?.forEach((questao, index) => {
        if (!questao.enunciado) erros.push(`Questão ${index + 1}: Enunciado é obrigatório`);
        if (!questao.alternativas || !Array.isArray(questao.alternativas)) erros.push(`Questão ${index + 1}: Alternativas devem ser um array`);
        if (!questao.resposta_correta) erros.push(`Questão ${index + 1}: Resposta correta é obrigatória`);
      });
      return { success: erros.length === 0, data: { valido: erros.length === 0, erros }, message: erros.length === 0 ? 'JSON válido' : 'JSON inválido' };
    } catch {
      return { success: false, data: { valido: false, erros: ['Erro ao validar JSON'] }, message: 'Erro na validação' };
    }
  }

  validarJsonQuestoesSemana(dados: { titulo?: string; numero_semana?: number; ano?: number; concurso_id?: string; questoes?: unknown[] }): ApiResponse<{ valido: boolean; erros: string[] }> {
    try {
      const erros: string[] = [];
      if (!dados.titulo) erros.push('Título é obrigatório');
      if (!dados.numero_semana) erros.push('Número da semana é obrigatório');
      if (!dados.ano) erros.push('Ano é obrigatório');
      if (!dados.concurso_id) erros.push('Concurso é obrigatório');
      if (!dados.questoes || !Array.isArray(dados.questoes)) erros.push('Questões devem ser um array');
      return { success: erros.length === 0, data: { valido: erros.length === 0, erros }, message: erros.length === 0 ? 'JSON válido' : 'JSON inválido' };
    } catch {
      return { success: false, data: { valido: false, erros: ['Erro ao validar JSON'] }, message: 'Erro na validação' };
    }
  }

  validarJsonApostila(dados: { titulo?: string; concurso_id?: string; conteudo?: unknown[] }): ApiResponse<{ valido: boolean; erros: string[] }> {
    try {
      const erros: string[] = [];
      if (!dados.titulo) erros.push('Título é obrigatório');
      if (!dados.concurso_id) erros.push('Concurso é obrigatório');
      if (!dados.conteudo || !Array.isArray(dados.conteudo)) erros.push('Conteúdo deve ser um array');
      return { success: erros.length === 0, data: { valido: erros.length === 0, erros }, message: erros.length === 0 ? 'JSON válido' : 'JSON inválido' };
    } catch {
      return { success: false, data: { valido: false, erros: ['Erro ao validar JSON'] }, message: 'Erro na validação' };
    }
  }
}

export default ValidationAdminService;


