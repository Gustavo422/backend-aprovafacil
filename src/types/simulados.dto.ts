// DTO de Simulados
export interface SimuladoDTO {
  id: string;
  titulo: string;
  questoes: string[];
  resultado?: string | number | boolean;
  // Adicione outros campos relevantes
} 