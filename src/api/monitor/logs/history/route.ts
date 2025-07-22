import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Request } from 'express';

const supabaseUrl = process.env['SUPABASE_URL'] || '';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
  // Autenticação manual admin
  const authHeader = req.headers['authorization'] as string | undefined;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Token de autenticação necessário' }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ success: false, error: 'Token de autenticação inválido' }, { status: 401 });
  }
  const { data: userProfile, error: profileError } = await supabase
    .from('usuarios')
    .select('id, email, role, nome')
    .eq('id', user.id)
    .single();
  if (profileError || !userProfile || userProfile.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Acesso negado. Permissão de administrador necessária.' }, { status: 403 });
  }

  // Buscar histórico dos últimos 100 logs
  const { data, error: fetchError } = await supabase
    .from('historico_logs')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(100);
  if (fetchError) {
    return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, history: data });
} 



