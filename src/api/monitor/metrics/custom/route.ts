import { Request, Response } from 'express';
import { supabase } from '../../../../config/supabase-unified.js';
import { registerMetricHistory } from '../../../../utils/metrics-history';

export const POST = async (req: Request, res: Response) => {
  // Autenticação manual admin
  const authHeader = req.headers['authorization'] as string | undefined;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token de autenticação necessário' });
  }
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ success: false, error: 'Token de autenticação inválido' });
  }
  const { data: userProfile, error: profileError } = await supabase
    .from('usuarios')
    .select('id, email, role, nome')
    .eq('id', user.id)
    .single();
  if (profileError || !userProfile || userProfile.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acesso negado. Permissão de administrador necessária.' });
  }

  // Receber métrica customizada
  const { type, value, unit, details } = req.body;
  if (!type || typeof value !== 'number') {
    return res.status(400).json({ success: false, error: 'Parâmetros obrigatórios: type (string), value (number)' });
  }
  try {
    await registerMetricHistory({
      type,
      value,
      unit,
      details,
      collected_by: userProfile.id,
      collected_by_email: userProfile.email,
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' });
  }
}; 

