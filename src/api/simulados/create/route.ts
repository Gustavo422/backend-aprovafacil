// TODO: Refatorar para backend puro. Arquivo inteiro comentado por depender de variáveis/recursos de frontend/SSR/Next.js ou imports quebrados.
/*
// TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
// import { createRouteHandlerClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { z } from 'zod';
// TODO: Corrigir import de '@/lib/logger' para caminho relativo ou remover se não for usado.
// import { logger } from '@/lib/logger';

// Schema de validação para criação de simulado
const createSimuladoSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  questions_count: z.number().min(1, 'Deve ter pelo menos 1 questão'),
  time_minutes: z.number().min(1, 'Tempo deve ser maior que 0'),
  difficulty: z.enum(['Fácil', 'Médio', 'Difícil']),
  concurso_id: z.string().uuid().optional(),
  is_public: z.boolean().default(true),
  questions: z.array(z.object({
    question_text: z.string().min(1, 'Texto da questão é obrigatório'),
    alternatives: z.array(z.string()).min(2, 'Deve ter pelo menos 2 alternativas'),
    correct_answer: z.string().min(1, 'Resposta correta é obrigatória'),
    explanation: z.string().optional(),
    discipline: z.string().optional(),
    topic: z.string().optional(),
    difficulty: z.enum(['Fácil', 'Médio', 'Difícil']).optional(),
  })).min(1, 'Deve ter pelo menos 1 questão'),
});

// Função utilitária para gerar slug a partir do título
function generateSlug(title: string) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-')     // Substitui não alfanuméricos por hífen
    .replace(/(^-|-$)+/g, '');       // Remove hífens do início/fim
}

export async function POST(request: Request) {
  try {
    // TODO: Corrigir import de '@/lib/supabase' para caminho relativo ou remover se não for usado.
    // const supabase = await createRouteHandlerClient();

    // Verificar se o usuário está autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Validar dados da requisição
    const body = await request.json();
    const validatedData = createSimuladoSchema.parse(body);

    // Verificar se o número de questões corresponde
    if (validatedData.questions.length !== validatedData.questions_count) {
      return NextResponse.json(
        { error: 'Número de questões não corresponde ao declarado' },
        { status: 400 }
      );
    }

    // Gerar slug a partir do título
    const slug = generateSlug(validatedData.title);

    // Iniciar transação
    const { data: simulado, error: simuladoError } = await supabase
      .from('simulados-personalizados')
      .insert({
        title: validatedData.title,
        slug,
        description: validatedData.description,
        questions_count: validatedData.questions_count,
        time_minutes: validatedData.time_minutes,
        difficulty: validatedData.difficulty,
        concurso_id: validatedData.concurso_id,
        is_public: validatedData.is_public,
        created_by: user.id,
      })
      .select()
      .single();

    if (simuladoError) {
      logger.error('Erro ao criar simulado:', { error: simuladoError });
      return NextResponse.json(
        { error: 'Erro ao criar simulado' },
        { status: 500 }
      );
    }

    // Inserir questões
    const questionsToInsert = validatedData.questions.map((question, index) => ({
      simulado_id: simulado.id,
      question_number: index + 1,
      question_text: question.question_text,
      alternatives: question.alternatives,
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      discipline: question.discipline,
      topic: question.topic,
      difficulty: question.difficulty || validatedData.difficulty,
      concurso_id: validatedData.concurso_id,
    }));

    const { data: questions, error: questionsError } = await supabase
      .from('simulado_questions')
      .insert(questionsToInsert)
      .select();

    if (questionsError) {
      logger.error('Erro ao inserir questões:', { error: questionsError });
      
      // Reverter criação do simulado
      await supabase
        .from('simulados-personalizados')
        .delete()
        .eq('id', simulado.id);

      return NextResponse.json(
        { error: 'Erro ao criar questões do simulado' },
        { status: 500 }
      );
    }

    // Log de auditoria
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'SIMULADO_CREATED',
      table_name: 'simulados-personalizados',
      record_id: simulado.id,
      new_values: {
        title: validatedData.title,
        questions_count: validatedData.questions_count,
        difficulty: validatedData.difficulty,
      },
    });

    return NextResponse.json({
      success: true,
      simulado: {
        ...simulado,
        questions,
      },
    });

  } catch (error) {
    logger.error('Erro ao processar criação de simulado:', { 
      error: error instanceof Error ? error.message : String(error)
    });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

*/
