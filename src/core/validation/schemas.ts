import { z } from 'zod';

// Schema de validação para usuário
export const UserSchema = z.object({
  id: z.string().optional(),
  email: z.string().email('Email inválido'),
  senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  token: z.string().optional(),
});

// Schema de validação para login
export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
});

// Schema de validação para registro
export const RegisterSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
});

// Schema de validação para reset de senha
export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  novaSenha: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
});

// Schema de validação para apostilas
export const ApostilaSchema = z.object({
  id: z.string().optional(),
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().optional(),
  categoria: z.string().min(1, 'Categoria é obrigatória'),
  conteudo: z.string().optional(),
  userId: z.string().optional(),
});

// Schema de validação para flashcards
export const FlashcardSchema = z.object({
  id: z.string().optional(),
  pergunta: z.string().min(1, 'Pergunta é obrigatória'),
  resposta: z.string().min(1, 'Resposta é obrigatória'),
  categoria: z.string().min(1, 'Categoria é obrigatória'),
  userId: z.string().optional(),
});

// Schema de validação para simulados
export const SimuladoSchema = z.object({
  id: z.string().optional(),
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().optional(),
  questoes: z.array(z.string()).optional(),
  tempoLimite: z.number().positive('Tempo limite deve ser positivo').optional(),
  userId: z.string().optional(),
});

// Schema de validação para plano de estudos
export const PlanoEstudosSchema = z.object({
  id: z.string().optional(),
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().optional(),
  disciplinas: z.array(z.string()).optional(),
  cronograma: z.record(z.any()).optional(),
  userId: z.string().optional(),
});

// Schema de validação para mapa de assuntos
export const MapaAssuntosSchema = z.object({
  id: z.string().optional(),
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().optional(),
  assuntos: z.array(z.string()).optional(),
  userId: z.string().optional(),
});

// Schema de validação para questões semanais
export const QuestoesSemanaisSchema = z.object({
  id: z.string().optional(),
  titulo: z.string().min(1, 'Título é obrigatório'),
  questoes: z.array(z.string()).optional(),
  semana: z.number().positive('Semana deve ser positiva'),
  userId: z.string().optional(),
});

// Schema de validação para estatísticas
export const EstatisticasSchema = z.object({
  id: z.string().optional(),
  tipo: z.string().min(1, 'Tipo é obrigatório'),
  dados: z.record(z.any()).optional(),
  userId: z.string().optional(),
});

// Schema de validação para conteúdo
export const ConteudoSchema = z.object({
  id: z.string().optional(),
  titulo: z.string().min(1, 'Título é obrigatório'),
  tipo: z.string().min(1, 'Tipo é obrigatório'),
  conteudo: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Schema de validação para categoria de disciplinas
export const CategoriaDisciplinasSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  cor: z.string().optional(),
});

// Schema de validação para concursos
export const ConcursoSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  dataProva: z.string().optional(),
  status: z.enum(['ativo', 'inativo', 'em_breve']).optional(),
});

// Schema de validação para categorias de concurso
export const ConcursoCategoriaSchema = z.object({
  id: z.string().optional(),
  concursoId: z.string().min(1, 'ID do concurso é obrigatório'),
  categoriaId: z.string().min(1, 'ID da categoria é obrigatório'),
});

// Schema de validação para preferências de usuário
export const UserPreferenceSchema = z.object({
  id: z.string().optional(),
  userId: z.string().min(1, 'ID do usuário é obrigatório'),
  concursoId: z.string().optional(),
  configuracoes: z.record(z.any()).optional(),
});

// Schema de validação para weak points
export const WeakPointsSchema = z.object({
  id: z.string().optional(),
  userId: z.string().min(1, 'ID do usuário é obrigatório'),
  disciplina: z.string().min(1, 'Disciplina é obrigatória'),
  pontos: z.array(z.string()).optional(),
  nivel: z.enum(['baixo', 'medio', 'alto']).optional(),
});

// Schema de validação para dashboard
export const DashboardSchema = z.object({
  id: z.string().optional(),
  userId: z.string().min(1, 'ID do usuário é obrigatório'),
  tipo: z.string().min(1, 'Tipo é obrigatório'),
  dados: z.record(z.any()).optional(),
});

// Schema de validação para admin
export const AdminSchema = z.object({
  id: z.string().optional(),
  acao: z.string().min(1, 'Ação é obrigatória'),
  parametros: z.record(z.any()).optional(),
  timestamp: z.date().optional(),
});

// Tipos derivados dos schemas
export type UserDTO = z.infer<typeof UserSchema>;
export type LoginDTO = z.infer<typeof LoginSchema>;
export type RegisterDTO = z.infer<typeof RegisterSchema>;
export type ResetPasswordDTO = z.infer<typeof ResetPasswordSchema>;
export type ApostilaDTO = z.infer<typeof ApostilaSchema>;
export type FlashcardDTO = z.infer<typeof FlashcardSchema>;
export type SimuladoDTO = z.infer<typeof SimuladoSchema>;
export type PlanoEstudosDTO = z.infer<typeof PlanoEstudosSchema>;
export type MapaAssuntosDTO = z.infer<typeof MapaAssuntosSchema>;
export type QuestoesSemanaisDTO = z.infer<typeof QuestoesSemanaisSchema>;
export type EstatisticasDTO = z.infer<typeof EstatisticasSchema>;
export type ConteudoDTO = z.infer<typeof ConteudoSchema>;
export type CategoriaDisciplinasDTO = z.infer<typeof CategoriaDisciplinasSchema>;
export type ConcursoDTO = z.infer<typeof ConcursoSchema>;
export type ConcursoCategoriaDTO = z.infer<typeof ConcursoCategoriaSchema>;
export type UserPreferenceDTO = z.infer<typeof UserPreferenceSchema>;
export type WeakPointsDTO = z.infer<typeof WeakPointsSchema>;
export type DashboardDTO = z.infer<typeof DashboardSchema>;
export type AdminDTO = z.infer<typeof AdminSchema>; 