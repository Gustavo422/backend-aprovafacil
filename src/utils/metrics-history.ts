import { supabase } from '../config/supabase-unified.js';

export async function registerMetricHistory({
  type,
  value,
  unit,
  details,
  collected_by,
  collected_by_email,
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
    collected_by_email,
  });
} 

