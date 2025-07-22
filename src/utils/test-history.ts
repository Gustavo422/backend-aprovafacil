import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env['SUPABASE_URL'] || '';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function registerTestRun({
  user_id,
  user_email,
  file,
  test_nome,
  status,
  duration,
  output,
  error
}: {
  user_id: string,
  user_email: string,
  file?: string,
  test_nome?: string,
  status: string,
  duration?: number,
  output?: string,
  error?: string
}) {
  await supabase.from('test_runs').insert({
    user_id,
    user_email,
    file,
    test_nome,
    status,
    duration,
    output,
    error
  });
} 



