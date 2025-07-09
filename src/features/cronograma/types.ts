// Tipo básico para Cronograma
export interface Cronograma {
  id: string;
  user_id: string;
  titulo: string;
  descricao?: string;
  data_inicio: string;
  data_fim: string;
  created_at: string;
  updated_at: string;
} 