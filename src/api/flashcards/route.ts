/* global Request URL console */
import { NextResponse } from 'next/server';
import { FlashcardsService } from '../../features/flashcards/flashcards.service';
import { Validator, FlashcardSchema } from '../../core/validation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const disciplina = searchParams.get('disciplina');
    const tema = searchParams.get('tema');

    const flashcardService = new FlashcardsService();

    // Buscar flashcards
    const flashcards = await flashcardService.getAll();
    
    // Filtrar por disciplina e tema se fornecidos
    let flashcardsFiltrados = flashcards;
    
    if (disciplina) {
      flashcardsFiltrados = flashcardsFiltrados.filter(
        (f: unknown) => (f as Record<string, unknown>).disciplina === disciplina
      );
    }
    
    if (tema) {
      flashcardsFiltrados = flashcardsFiltrados.filter(
        (f: unknown) => (f as Record<string, unknown>).tema === tema
      );
    }

    return NextResponse.json({
      success: true,
      flashcards: flashcardsFiltrados
    });
  } catch (error) {
    console.error('Erro ao buscar flashcards:', error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validação usando Zod
    const validation = Validator.validate(FlashcardSchema, body);
    
    if (!validation.success || !validation.data) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Dados inválidos',
            details: validation.errors
          } 
        },
        { status: 400 }
      );
    }

    const flashcardService = new FlashcardsService();
    const flashcard = await flashcardService.create();

    return NextResponse.json({
      success: true,
      message: 'Flashcard criado com sucesso',
      flashcard
    });

  } catch (error) {
    console.error('Erro ao criar flashcard:', error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
