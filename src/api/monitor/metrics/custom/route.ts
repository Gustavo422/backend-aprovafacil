import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { registerMetricHistory } from '../../../../utils/metrics-history';

const supabaseUrl = process.env['SUPABASE_URL'] || '';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  // Autenticação manual admin
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Token de autenticação necessário' }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ success: false, error: 'Token de autenticação inválido' }, { status: 401 });
  }
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, email, role, nome')
    .eq('id', user.id)
    .single();
  if (profileError || !userProfile || userProfile.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acesso negado. Permissão de administrador necessária.' }, { status: 403 });
  }

  // Receber métrica customizada
  const body = await req.json();
  const { type, value, unit, details } = body;
  if (!type || typeof value !== 'number') {
    return NextResponse.json({ success: false, error: 'Parâmetros obrigatórios: type (string), value (number)' }, { status: 400 });
  }
  try {
    await registerMetricHistory({
      type,
      value,
      unit,
      details,
      collected_by: userProfile.id,
      collected_by_email: userProfile.email
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' }, { status: 500 });
  }
} 