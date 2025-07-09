import { NextResponse } from 'next/server';
import { cronogramaService } from '../../features/cronograma';
 
export async function GET() {
  // Chama o service básico
  const data = cronogramaService.getCronograma();
  return NextResponse.json(data);
} 