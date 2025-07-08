import { NextResponse } from 'next/server';
import { metricsStore } from '../../../core/monitoring/metrics-store.js';
import { sendEmailAlert, sendSlackAlert } from '../../../utils/alert';
import { createClient } from '@supabase/supabase-js';
import { NextRequest as Request } from 'next/server';

const supabaseUrl = process.env['SUPABASE_URL'] || '';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    const alerts = metricsStore.getAlerts();
    
    return NextResponse.json({
      alerts,
      count: alerts.length,
      hasErrors: alerts.some(alert => alert.type === 'error'),
      hasWarnings: alerts.some(alert => alert.type === 'warning'),
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Erro ao obter alertas:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 

export async function POST(req: Request) {
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

  // Disparar alerta
  const body = await req.json();
  const { type, subject, message, to } = body;
  try {
    if (type === 'email') {
      await sendEmailAlert(subject || 'Alerta AprovaFácil', message, to);
    } else if (type === 'slack') {
      await sendSlackAlert(message);
    } else {
      // Ambos
      await sendEmailAlert(subject || 'Alerta AprovaFácil', message, to);
      await sendSlackAlert(message);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' }, { status: 500 });
  }
} 