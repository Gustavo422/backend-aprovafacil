/* global Request URL console */
import { NextResponse } from 'next/server';
import { ApostilasService } from '../../features/apostilas/apostilas.service';
import { Validator, ApostilaSchema } from '../../core/validation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const categoria = searchParams.get('categoria');

    const apostilaService = new ApostilasService();

    if (id) {
      // Buscar apostila específica
      const apostila = await apostilaService.getById();
      
      if (!apostila) {
        return NextResponse.json(
          { error: 'Apostila não encontrada' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        apostila
      });
    } else {
      // Buscar lista de apostilas
      const apostilas = await apostilaService.getAll();
      
      // Filtrar por categoria se fornecida
      const apostilasFiltradas = categoria 
        ? apostilas.filter((a: unknown) => (a as Record<string, unknown>).categoria === categoria)
        : apostilas;

      return NextResponse.json({
        success: true,
        apostilas: apostilasFiltradas
      });
    }
  } catch (error) {
    console.error('Erro ao buscar apostilas:', error);
    
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
    const validation = Validator.validate(ApostilaSchema, body);
    
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

    const apostilaService = new ApostilasService();
    const apostila = await apostilaService.create();

    return NextResponse.json({
      success: true,
      message: 'Apostila criada com sucesso',
      apostila
    });

  } catch (error) {
    console.error('Erro ao criar apostila:', error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
