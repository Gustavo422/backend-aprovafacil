/* global Request console */
import { NextResponse } from 'next/server';
import { AuthService } from '../../../features/auth/auth.service';
import { Validator, RegisterSchema } from '../../../core/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validação usando Zod
    const validation = Validator.validate(RegisterSchema, body);
    
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

    const { email, senha, nome } = validation.data;
    
    // Usar o AuthService
    const authService = new AuthService();
    const user = await authService.register({
      id: '',
      email,
      senha,
      nome,
      token: ''
    } as unknown);

    return NextResponse.json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: {
        id: user.id,
        email: user.email,
        nome: (user as unknown as Record<string, unknown>).nome || user.email
      }
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Erro interno do servidor. Tente novamente.' 
        } 
      },
      { status: 500 }
    );
  }
}
