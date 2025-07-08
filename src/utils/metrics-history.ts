import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env['SUPABASE_URL'] || '';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function registerMetricHistory({
  type,
  value,
  unit,
  details,
  collected_by,
  collected_by_email
}: {
  type: string,
  value: number,
  unit?: string,
  details?: string,
  collected_by?: string,
  collected_by_email?: string
}) {
  await supabase.from('metrics_history').insert({
    type,
    value,
    unit,
    details,
    collected_by,
    collected_by_email
  });
} 