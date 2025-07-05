/* global Request console */
import { NextResponse } from 'next/server';
import { AuthService } from '../../../features/auth/auth.service';
import { Validator, LoginSchema } from '../../../core/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validação usando Zod
    const validation = Validator.validate(LoginSchema, body);
    
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

    const { email, senha } = validation.data;
    
    // Usar o AuthService
    const authService = new AuthService();
    const user = await authService.login(email, senha);

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'INVALID_CREDENTIALS', 
            message: 'Email ou senha incorretos'
          } 
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nome: (user as unknown as Record<string, unknown>).nome || user.email
      },
      message: 'Login realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro no login:', error);
    
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
