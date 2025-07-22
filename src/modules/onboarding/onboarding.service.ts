import { supabase } from '../../config/supabase.js';
import { LogService } from '../../core/utils/log.service.js';

export async function onboardingHandler(param: string) {
  const { data, error } = await supabase
    .from('onboarding_respostas')
    .select('id')
    .eq('usuario_auth_user_id', param)
    .single();
  if (error && error.code !== 'PGRST116') {
    this.logService.erro('Erro ao verificar onboarding', error, { error: error.message });
    throw error;
  }
  return !data;
}

export interface OnboardingData {
  concurso_id: string;
  horas_disponiveis: number;
  tempo_falta_concurso: string;
  nivel_preparacao: string;
  niveis_materias?: unknown;
}

export class OnboardingService {
  private logService: LogService;

  constructor(logService: LogService) {
    this.logService = logService;
  }

  async requireOnboarding(authUserId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('onboarding_respostas')
      .select('id')
      .eq('usuario_auth_user_id', authUserId)
      .single();
    if (error && error.code !== 'PGRST116') {
      this.logService.erro('Erro ao verificar onboarding', error, { error: error.message });
      throw error;
    }
    return !data;
  }

  async saveOnboarding(authUserId: string, onboardingData: OnboardingData): Promise<boolean> {
    const { data, error } = await supabase
      .from('onboarding_respostas')
      .insert([
        {
          usuario_auth_user_id: authUserId,
          concurso_id: onboardingData.concurso_id,
          horas_disponiveis: onboardingData.horas_disponiveis,
          tempo_falta_concurso: onboardingData.tempo_falta_concurso,
          nivel_preparacao: onboardingData.nivel_preparacao,
          niveis_materias: onboardingData.niveis_materias || null,
        },
      ])
      .select()
      .single();
    if (error) {
      this.logService.erro('Erro ao salvar onboarding', error, { error: error.message });
      return false;
    }
    return !!data;
  }
} 