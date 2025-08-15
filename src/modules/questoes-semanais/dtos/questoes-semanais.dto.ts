import { z } from 'zod';

// DTOs públicos do módulo Questões Semanais (snake_case alinhado ao DB)

export interface SemanaBasicaDTO {
  id: string;
  numero_semana: number;
  ano: number;
  titulo?: string | null;
  descricao?: string | null;
}

export interface QuestaoDTO {
  id: string;
  enunciado: string;
  alternativas: Record<string, unknown> | unknown[];
  resposta_correta?: string | null;
  explicacao?: string | null;
  disciplina?: string | null;
  assunto?: string | null;
  dificuldade?: string | null;
}

export interface HistoricoItemDTO {
  id: string;
  numero_semana: number | null;
  ano: number | null;
  concluido_em: string;
  pontuacao: number | null;
  total_questoes: number | null;
}

export type RoadmapStatus = 'done' | 'current' | 'locked' | 'available';

export interface RoadmapItemDTO {
  numero_semana: number;
  status: RoadmapStatus;
  liberaEm?: string;
}

export interface AtualResponseDTO {
  questao_semanal: SemanaBasicaDTO | null;
  questoes: QuestaoDTO[];
  historico: HistoricoItemDTO[];
  status: {
    semana_atual: number;
    inicio_semana_em: string;
    fim_semana_em: string;
    modo_desbloqueio: 'strict' | 'accelerated';
    tempo_restante?: number; // em segundos, apenas para modo strict
  };
}

export const concluirSemanaBodySchema = z.object({
  respostas: z.array(z.any()).optional(),
  pontuacao: z.number().optional().default(0),
  tempo_minutos: z.number().optional(),
});

export type ConcluirSemanaBody = z.infer<typeof concluirSemanaBodySchema>;

export interface HistoricoQueryDTO {
  cursor?: string | null;
  limit?: number | null;
}

export interface HistoricoResponseDTO {
  items: HistoricoItemDTO[];
  nextCursor: string | null;
  limit: number;
}


