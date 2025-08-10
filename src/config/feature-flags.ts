// Backend Feature Flags configuration for Guru module rollout
// Centraliza leitura de variáveis de ambiente e regras de canário

export type RolloutStrategy = 'off' | 'on' | 'canary';

interface GuruFeatureFlagsConfig {
  guruNewModule: RolloutStrategy;
  canaryPercent: number; // 0 a 100
}

function parseRolloutStrategy(value: string | undefined): RolloutStrategy {
  const normalized = (value ?? 'on').toLowerCase().trim();
  if (normalized === 'off' || normalized === '0' || normalized === 'false') return 'off';
  if (normalized === 'canary') return 'canary';
  return 'on';
}

function clampPercent(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.floor(n);
}

export const guruFeatureFlags: GuruFeatureFlagsConfig = {
  guruNewModule: parseRolloutStrategy(process.env.GURU_NEW_MODULE_FLAG),
  canaryPercent: clampPercent(parseInt(process.env.GURU_NEW_MODULE_CANARY_PERCENT ?? '0', 10)),
};

export function isGuruNewModuleEnabled(): boolean {
  return guruFeatureFlags.guruNewModule === 'on' || guruFeatureFlags.guruNewModule === 'canary';
}

export function isGuruNewModuleFullyEnabled(): boolean {
  return guruFeatureFlags.guruNewModule === 'on';
}

/**
 * Determina se a requisição pertence ao segmento canário com base em um identificador estável.
 * Usa hashing leve determinístico (FNV-like) sobre userId ou IP.
 */
export function isRequestInGuruCanarySegment(stableId: string | undefined): boolean {
  if (guruFeatureFlags.guruNewModule !== 'canary') return false;
  if (!stableId) return false;
  const hash = simpleHash(stableId);
  const percentile = hash % 100; // 0-99
  return percentile < guruFeatureFlags.canaryPercent;
}

function simpleHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
}


