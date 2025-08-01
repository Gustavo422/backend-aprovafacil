import { supabase } from '../config/supabase-unified.js';

export async function registerLogHistory({
  usuario_id,
  user_email,
  level,
  service,
  message,
  details,
}: {
  usuario_id?: string,
  user_email?: string,
  level: string,
  service?: string,
  message: string,
  details?: string
}) {
  await supabase.from('historico_logs').insert({
    usuario_id,
    user_email,
    level,
    service,
    message,
    details,
  });
} 

