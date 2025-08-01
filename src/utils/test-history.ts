import { supabase } from '../config/supabase-unified.js';

export async function registerTestRun({
  usuario_id,
  user_email,
  file,
  test_nome,
  status,
  duration,
  output,
  error,
}: {
  usuario_id: string,
  user_email: string,
  file?: string,
  test_nome?: string,
  status: string,
  duration?: number,
  output?: string,
  error?: string
}) {
  await supabase.from('test_runs').insert({
    usuario_id,
    user_email,
    file,
    test_nome,
    status,
    duration,
    output,
    error,
  });
} 

