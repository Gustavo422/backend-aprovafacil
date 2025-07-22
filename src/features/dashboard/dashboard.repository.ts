// Repository de Dashboard - refatoração SOLID
import { DashboardDTO } from '../../types/dashboard.dto.js';

export class DashboardRepository {
  async fetchStats(): Promise<DashboardDTO> {
    // TODO: Implementar acesso ao banco
    return { resumo: '', stats: {} };
  }

  async fetchUsuarioStats(): Promise<DashboardDTO> {
    // TODO: Implementar acesso ao banco
    return { resumo: '', stats: {} };
  }

  async fetchResumo(): Promise<string> {
    // TODO: Implementar acesso ao banco
    return '';
  }
} 



