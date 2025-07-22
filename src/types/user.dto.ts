// DTO de User - Atualizado para corresponder ao schema real
export interface UserDTO {
  id: string;
  nome: string;
  email: string;
  ultimo_login?: string;
  criado_em: string;
  atualizado_em: string;
  total_questoes_respondidas: number;
  total_resposta_corretas: number;
  tempo_estudo_minutos: number;
  pontuacao_media: number;
}

export interface CreateUserDTO {
  email: string;
  nome?: string;
  avatar_url?: string;
}

export interface UpdateUserDTO {
  email?: string;
  nome?: string;
  avatar_url?: string;
  ativo?: boolean;
}
