import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env['SUPABASE_URL'] || '';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
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
  if (profileError || !userProfile) {
    return NextResponse.json({ success: false, error: 'Usuário não encontrado' }, { status: 404 });
  }
  return NextResponse.json({
    success: true,
    id: userProfile.id,
    email: userProfile.email,
    role: userProfile.role,
    nome: userProfile.nome
  });
} 