import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env['SUPABASE_URL'] || '';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function registerLogHistory({
  user_id,
  user_email,
  level,
  service,
  message,
  details
}: {
  user_id?: string,
  user_email?: string,
  level: string,
  service?: string,
  message: string,
  details?: string
}) {
  await supabase.from('log_history').insert({
    user_id,
    user_email,
    level,
    service,
    message,
    details
  });
} 