// DTO de Estatísticas
export interface EstatisticasDTO {
  id: string;
  userId: string;
  resumo: string;
  dados: Record<string, number | string | boolean>;
  // Adicione outros campos relevantes
} 