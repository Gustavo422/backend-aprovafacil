import { NextRequest, NextResponse } from 'next/server';
import { generateOpenAPISpec } from '../../src/core/documentation/openapi';

export async function GET(request: NextRequest) {
  try {
    const spec = generateOpenAPISpec();
    
    return NextResponse.json(spec, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Erro ao gerar documentação OpenAPI:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 