import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
// Configuração do Supabase
const supabaseUrl = process.env['SUPABASE_URL'];
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente do Supabase não configuradas');
    console.error('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    process.exit(1);
}
// Cliente Supabase para operações do servidor
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
// Cliente Supabase para operações do cliente (browser)
const supabaseAnonKey = process.env['SUPABASE_ANON_KEY'];
if (!supabaseAnonKey) {
    console.error('❌ SUPABASE_ANON_KEY não configurada');
    process.exit(1);
}
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
// Exportar objeto default para compatibilidade
export default {
    supabase,
    supabaseClient
};
