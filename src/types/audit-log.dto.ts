// DTO de Audit Log - Atualizado para corresponder ao schema real
export interface AuditLogDTO {
  id: string;
  user_id?: string;
  action: string;
  table_nome: string;
  record_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  criado_em: string;
}

export interface CreateAuditLogDTO {
  user_id?: string;
  action: string;
  table_nome: string;
  record_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export interface UpdateAuditLogDTO {
  user_id?: string;
  action?: string;
  table_nome?: string;
  record_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}
