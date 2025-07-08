// DTO de Autenticação
export interface AuthDTO {
  id: string;
  email: string;
  senha: string;
  token?: string;
  nome?: string;
  // Adicione outros campos relevantes
} 