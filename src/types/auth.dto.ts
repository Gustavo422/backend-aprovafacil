// DTO de Autenticação
export interface AuthDTO {
  id: string;
  email: string;
  senha: string;
  token?: string;
  // Adicione outros campos relevantes
} 