/**
 * Database types for Supabase
 */
export type Database = {
  public: {
    Tables: {
      // Existing tables
      usuarios: {
        Row: {
          id: string;
          nome: string;
          email: string;
          senha_hash: string;
          ativo: boolean;
          primeiro_login: boolean;
          ultimo_login: string | null;
          total_questoes_respondidas: number;
          total_acertos: number;
          tempo_estudo_minutos: number;
          pontuacao_media: number;
          criado_em: string;
          atualizado_em: string;
          role: 'user' | 'admin';
          auth_usuario_id: string | null;
        };
        Insert: {
          id?: string;
          nome: string;
          email: string;
          senha_hash: string;
          ativo?: boolean;
          primeiro_login?: boolean;
          ultimo_login?: string | null;
          total_questoes_respondidas?: number;
          total_acertos?: number;
          tempo_estudo_minutos?: number;
          pontuacao_media?: number;
          criado_em?: string;
          atualizado_em?: string;
          role?: 'user' | 'admin';
          auth_usuario_id?: string | null;
        };
        Update: {
          id?: string;
          nome?: string;
          email?: string;
          senha_hash?: string;
          ativo?: boolean;
          primeiro_login?: boolean;
          ultimo_login?: string | null;
          total_questoes_respondidas?: number;
          total_acertos?: number;
          tempo_estudo_minutos?: number;
          pontuacao_media?: number;
          criado_em?: string;
          atualizado_em?: string;
          role?: 'user' | 'admin';
          auth_usuario_id?: string | null;
        };
      };
      
      // New tables
      migrations: {
        Row: {
          id: string;
          name: string;
          version: number;
          status: string;
          applied_at: string | null;
          rolled_back_at: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          version: number;
          status: string;
          applied_at?: string | null;
          rolled_back_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          version?: number;
          status?: string;
          applied_at?: string | null;
          rolled_back_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
      };
      
      user_sessions: {
        Row: {
          id: string;
          usuario_id: string;
          created_at: string;
          expires_at: string;
          last_active_at: string;
          user_agent: string | null;
          ip_address: string | null;
          is_active: boolean;
          refresh_token: string | null;
          device_id: string | null;
          device_name: string | null;
          metadata: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          created_at?: string;
          expires_at: string;
          last_active_at?: string;
          user_agent?: string | null;
          ip_address?: string | null;
          is_active?: boolean;
          refresh_token?: string | null;
          device_id?: string | null;
          device_name?: string | null;
          metadata?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          created_at?: string;
          expires_at?: string;
          last_active_at?: string;
          user_agent?: string | null;
          ip_address?: string | null;
          is_active?: boolean;
          refresh_token?: string | null;
          device_id?: string | null;
          device_name?: string | null;
          metadata?: Record<string, unknown> | null;
        };
      };
      
      connection_logs: {
        Row: {
          id: string;
          usuario_id: string | null;
          timestamp: string;
          event_type: string;
          status: string;
          error_message: string | null;
          request_path: string | null;
          request_method: string | null;
          response_status: number | null;
          duration_ms: number | null;
          client_info: Record<string, unknown> | null;
          metadata: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          usuario_id?: string | null;
          timestamp?: string;
          event_type: string;
          status: string;
          error_message?: string | null;
          request_path?: string | null;
          request_method?: string | null;
          response_status?: number | null;
          duration_ms?: number | null;
          client_info?: Record<string, unknown> | null;
          metadata?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          usuario_id?: string | null;
          timestamp?: string;
          event_type?: string;
          status?: string;
          error_message?: string | null;
          request_path?: string | null;
          request_method?: string | null;
          response_status?: number | null;
          duration_ms?: number | null;
          client_info?: Record<string, unknown> | null;
          metadata?: Record<string, unknown> | null;
        };
      };
      
      health_checks: {
        Row: {
          id: string;
          check_name: string;
          status: string;
          details: Record<string, unknown> | null;
          duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          check_name: string;
          status: string;
          details?: Record<string, unknown> | null;
          duration_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          check_name?: string;
          status?: string;
          details?: Record<string, unknown> | null;
          duration_ms?: number | null;
          created_at?: string;
        };
      };
      
      system_metrics: {
        Row: {
          id: string;
          metric_name: string;
          metric_value: number;
          details: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          metric_name: string;
          metric_value: number;
          details?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          metric_name?: string;
          metric_value?: number;
          details?: Record<string, unknown> | null;
          created_at?: string;
        };
      };
      
      // Cache monitoring tables - Nomes em português
      metricas_cache: {
        Row: {
          id: string;
          operacao: string;
          tipo_cache: string;
          chave_cache: string | null;
          duracao_ms: number;
          resultado: string;
          tamanho_bytes: number | null;
          mensagem_erro: string | null;
          usuario_id: string | null;
          id_correlacao: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          operacao: string;
          tipo_cache: string;
          chave_cache?: string | null;
          duracao_ms: number;
          resultado: string;
          tamanho_bytes?: number | null;
          mensagem_erro?: string | null;
          usuario_id?: string | null;
          id_correlacao?: string | null;
          criado_em?: string;
        };
        Update: {
          id?: string;
          operacao?: string;
          tipo_cache?: string;
          chave_cache?: string | null;
          duracao_ms?: number;
          resultado?: string;
          tamanho_bytes?: number | null;
          mensagem_erro?: string | null;
          usuario_id?: string | null;
          id_correlacao?: string | null;
          criado_em?: string;
        };
      };
      
      configuracoes_monitor_cache: {
        Row: {
          id: string;
          chave_config: string;
          valor_config: Record<string, unknown>;
          descricao: string | null;
          ativo: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          chave_config: string;
          valor_config: Record<string, unknown>;
          descricao?: string | null;
          ativo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          chave_config?: string;
          valor_config?: Record<string, unknown>;
          descricao?: string | null;
          ativo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      
      snapshots_cache: {
        Row: {
          id: string;
          tipo_cache: string;
          quantidade_entradas: number;
          tamanho_total_bytes: number | null;
          quantidade_expiradas: number;
          quantidade_ativas: number;
          dados_snapshot: Record<string, unknown> | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          tipo_cache: string;
          quantidade_entradas: number;
          tamanho_total_bytes?: number | null;
          quantidade_expiradas?: number;
          quantidade_ativas?: number;
          dados_snapshot?: Record<string, unknown> | null;
          criado_em?: string;
        };
        Update: {
          id?: string;
          tipo_cache?: string;
          quantidade_entradas?: number;
          tamanho_total_bytes?: number | null;
          quantidade_expiradas?: number;
          quantidade_ativas?: number;
          dados_snapshot?: Record<string, unknown> | null;
          criado_em?: string;
        };
      };
      
      relacionamentos_chaves_cache: {
        Row: {
          id: string;
          chave_principal: string;
          chave_relacionada: string;
          tipo_cache: string;
          tipo_relacionamento: string;
          criado_em: string;
        };
        Insert: {
          id?: string;
          chave_principal: string;
          chave_relacionada: string;
          tipo_cache: string;
          tipo_relacionamento?: string;
          criado_em?: string;
        };
        Update: {
          id?: string;
          chave_principal?: string;
          chave_relacionada?: string;
          tipo_cache?: string;
          tipo_relacionamento?: string;
          criado_em?: string;
        };
      };
      
      log_auditoria_cache: {
        Row: {
          id: string;
          operacao: string;
          tipo_cache: string;
          chaves_cache: string[];
          detalhes_operacao: Record<string, unknown> | null;
          usuario_id: string | null;
          endereco_ip: string | null;
          user_agent: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          operacao: string;
          tipo_cache: string;
          chaves_cache: string[];
          detalhes_operacao?: Record<string, unknown> | null;
          usuario_id?: string | null;
          endereco_ip?: string | null;
          user_agent?: string | null;
          criado_em?: string;
        };
        Update: {
          id?: string;
          operacao?: string;
          tipo_cache?: string;
          chaves_cache?: string[];
          detalhes_operacao?: Record<string, unknown> | null;
          usuario_id?: string | null;
          endereco_ip?: string | null;
          user_agent?: string | null;
          criado_em?: string;
        };
      };
    };
    
    Functions: {
      create_migrations_table: {
        Args: Record<string, never>;
        Returns: void;
      };
      manage_user_session: {
        Args: {
          p_usuario_id: string;
          p_refresh_token: string;
          p_user_agent: string;
          p_ip_address: string;
          p_device_id?: string | null;
          p_device_name?: string | null;
          p_expires_in_days?: number;
        };
        Returns: string;
      };
      invalidate_user_sessions: {
        Args: {
          p_usuario_id: string;
          p_exclude_session_id?: string | null;
        };
        Returns: number;
      };
      clean_expired_sessions: {
        Args: Record<string, never>;
        Returns: number;
      };
      log_connection_event: {
        Args: {
          p_usuario_id: string | null;
          p_event_type: string;
          p_status: string;
          p_error_message?: string | null;
          p_request_path?: string | null;
          p_request_method?: string | null;
          p_response_status?: number | null;
          p_duration_ms?: number | null;
          p_client_info?: Record<string, unknown> | null;
          p_metadata?: Record<string, unknown> | null;
        };
        Returns: string;
      };
      clean_old_connection_logs: {
        Args: {
          p_days_to_keep?: number;
        };
        Returns: number;
      };
      get_connection_statistics: {
        Args: {
          p_start_date?: string;
          p_end_date?: string;
        };
        Returns: {
          date: string;
          total_connections: number;
          successful_connections: number;
          failed_connections: number;
          avg_duration_ms: number;
        }[];
      };
      record_health_check: {
        Args: {
          p_check_name: string;
          p_status: string;
          p_details?: Record<string, unknown> | null;
          p_duration_ms?: number | null;
        };
        Returns: string;
      };
      record_system_metric: {
        Args: {
          p_metric_name: string;
          p_metric_value: number;
          p_details?: Record<string, unknown> | null;
        };
        Returns: string;
      };
      get_latest_health_checks: {
        Args: Record<string, never>;
        Returns: {
          check_name: string;
          status: string;
          details: Record<string, unknown> | null;
          duration_ms: number | null;
          created_at: string;
        }[];
      };
      get_system_metrics_over_time: {
        Args: {
          p_metric_name: string;
          p_start_date?: string;
          p_end_date?: string;
          p_interval?: string;
        };
        Returns: {
          time_bucket: string;
          avg_value: number;
          min_value: number;
          max_value: number;
        }[];
      };
      perform_database_health_check: {
        Args: Record<string, never>;
        Returns: Record<string, unknown>;
      };
      clean_old_monitoring_data: {
        Args: {
          p_days_to_keep?: number;
        };
        Returns: number;
      };
    };
  };
};