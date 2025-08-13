import { z } from 'zod';

// Schema para progresso por slug (POST)
export const progressBySlugSchema = z.object({
  respostas: z.record(z.unknown()).optional(),
  pontuacao: z.coerce.number().min(0).optional(),
  tempo_gasto_minutos: z.coerce.number().min(0).optional(),
  is_concluido: z.boolean().optional(),
  concluido_em: z.string().datetime().optional(),
  // legados (compat)
  answers: z.record(z.unknown()).optional(),
  score: z.coerce.number().min(0).optional(),
  timeTaken: z.coerce.number().min(0).optional(),
}).transform((val) => ({
  respostas: (val.respostas ?? val.answers),
  pontuacao: val.pontuacao ?? val.score,
  tempo_gasto_minutos: val.tempo_gasto_minutos ?? val.timeTaken,
  is_concluido: val.is_concluido ?? undefined,
  concluido_em: val.concluido_em ?? undefined,
}));

// Schema para update de progresso por slug (PUT)
export const progressBySlugUpdateSchema = z.object({
  respostas: z.record(z.unknown()).optional(),
  pontuacao: z.coerce.number().min(0).optional(),
  tempo_gasto_minutos: z.coerce.number().min(0).optional(),
  is_concluido: z.boolean().optional(),
  concluido_em: z.string().datetime().nullable().optional(),
  // legados (compat)
  answers: z.record(z.unknown()).optional(),
  score: z.coerce.number().min(0).optional(),
  timeTaken: z.coerce.number().min(0).optional(),
}).transform((val) => ({
  respostas: (val.respostas ?? val.answers),
  pontuacao: val.pontuacao ?? val.score,
  tempo_gasto_minutos: val.tempo_gasto_minutos ?? val.timeTaken,
  is_concluido: val.is_concluido ?? undefined,
  concluido_em: val.concluido_em ?? undefined,
}));


