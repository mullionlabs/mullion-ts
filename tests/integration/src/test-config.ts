function readEnvValue(key: string): string | undefined {
  return process.env[key];
}

function readEnvString(key: string, fallback: string): string {
  const value = readEnvValue(key);
  return value && value.length > 0 ? value : fallback;
}

function readEnvInt(key: string, fallback: number): number {
  const value = readEnvValue(key);
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function readEnvBoolean(key: string, fallback: boolean): boolean {
  const value = readEnvValue(key);
  if (!value) {
    return fallback;
  }

  const normalized = value.toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function readEnvList(key: string, fallback: string[]): string[] {
  const value = readEnvValue(key);
  if (!value) {
    return fallback;
  }

  const parsed = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

export const OPENAI_MODEL = readEnvString('OPENAI_MODEL', 'gpt-4o-mini');
export const ANTHROPIC_MODEL = readEnvString(
  'ANTHROPIC_MODEL',
  'claude-3-5-haiku-20241022',
);
export const OPENAI_INVALID_MODEL = readEnvString(
  'OPENAI_INVALID_MODEL',
  `${OPENAI_MODEL}-invalid`,
);
export const ANTHROPIC_SONNET_MODELS = readEnvList('ANTHROPIC_SONNET_MODELS', [
  'claude-3-5-sonnet-20241022',
  'claude-3-sonnet-20240229',
]);
export const ANTHROPIC_ENABLE_SONNET = readEnvBoolean(
  'ANTHROPIC_ENABLE_SONNET',
  false,
);
export const ANTHROPIC_CACHE_MIN_TOKENS = readEnvInt(
  'ANTHROPIC_CACHE_MIN_TOKENS',
  2048,
);
export const ANTHROPIC_CACHE_DOC_SECTIONS = readEnvInt(
  'ANTHROPIC_CACHE_DOC_SECTIONS',
  90,
);

export function buildLongDocument(
  purpose: string,
  sections: number = ANTHROPIC_CACHE_DOC_SECTIONS,
): string {
  const normalizedPurpose = purpose.trim();
  const description = normalizedPurpose
    ? `used to ${normalizedPurpose}`
    : 'used to validate Anthropic cache behavior';

  return Array.from({length: sections}, (_, index) => {
    return (
      `Section ${index + 1}: ` +
      `This synthetic document is ${description}. ` +
      'It contains enough content to exceed the minimum token threshold.'
    );
  }).join('\n');
}
