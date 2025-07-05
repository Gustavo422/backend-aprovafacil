import { NextRequest, NextResponse } from 'next/server';
import { serveSwaggerUI } from '../../../src/core/documentation/swagger-ui';

export async function GET(request: NextRequest) {
  try {
    const html = serveSwaggerUI();
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Erro ao servir Swagger UI:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 