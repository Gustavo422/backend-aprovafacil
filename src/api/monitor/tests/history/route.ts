import { Request, Response } from 'express';
import { supabase } from '../../../../config/supabase-unified.js';

export const GET = async (req: Request, res: Response) => {
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

  // Buscar histórico dos últimos 100 testes
  const { data, error: fetchError } = await supabase
    .from('test_runs')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(100);
  if (fetchError) {
    return res.status(500).json({ success: false, error: fetchError.message });
  }
  return res.json({ success: true, history: data });
}; 

