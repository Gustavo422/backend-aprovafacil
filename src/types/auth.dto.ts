// DTO de Autenticação
export interface AuthDTO {
  id: string;
  email: string;
  senha: string;
  nome?: string;
  role?: string;
  ativo?: boolean;
  primeiro_login?: boolean;
  criado_em?: string;
  token?: string;
  // Adicione outros campos relevantes
} 



