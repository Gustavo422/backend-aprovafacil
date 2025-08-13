// Contexto compartilhado entre os sub-serviços administrativos
import type { ILogService, ICacheService, IUsuarioRepository } from '../../core/interfaces/index.js';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdminContext {
  logService: ILogService;
  cacheService: ICacheService;
  usuarioRepository: IUsuarioRepository;
  supabase: SupabaseClient;
}


