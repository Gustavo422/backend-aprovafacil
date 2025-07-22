import { createClient } from '@supabase/supabase-js';

export interface DatabaseStatus {
  status: 'healthy' | 'warning' | 'error';
  connected: boolean;
  responseTime: number;
  tables: {
    count: number;
    list: string[];
  };
  connectionPool: {
    active: number;
    idle: number;
    total: number;
  };
  errors: string[];
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const errors: string[] = [];
  let connected = false;
  let responseTime = 0;
  let tables = { count: 0, list: [] as string[] };
  let connectionPool = { active: 0, idle: 0, total: 0 };
  
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Testar conexão e medir tempo de resposta
    const startTime = Date.now();
    const { error } = await supabase
      .from('information_schema.tables')
      .select('table_nome')
      .eq('table_schema', 'public')
      .limit(1);
    
    responseTime = Date.now() - startTime;
    
    if (error) {
      throw error;
    }
    
    connected = true;
    
    // Obter lista de tabelas
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_nome')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      errors.push(`Erro ao listar tabelas: ${tablesError.message}`);
    } else {
      tables = {
        count: tablesData?.length || 0,
        list: tablesData?.map(t => t.table_nome) || []
      };
    }
    
    // Verificar thresholds
    if (responseTime > 1000) {
      errors.push(`Tempo de resposta lento: ${responseTime}ms`);
    }
    
  } catch (error) {
    errors.push(`Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
  
  const status = !connected ? 'error' : errors.length > 0 ? 'warning' : 'healthy';
  
  return {
    status,
    connected,
    responseTime,
    tables,
    connectionPool,
    errors
  };
} 



