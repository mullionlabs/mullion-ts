import {defineConfig} from 'vitest/config';

export default defineConfig({
  envPrefix: ['OPENAI_', 'ANTHROPIC_', 'GEMINI_', 'GOOGLE_GENERATIVE_AI_'],
  test: {
    // 30 second timeout for real API calls
    testTimeout: 30000,
    hookTimeout: 30000,

    // Sequential execution to avoid rate limits
    pool: 'forks',
    fileParallelism: false,

    // Environment
    environment: 'node',

    // Include test files
    include: ['src/**/*.test.ts'],

    // Global setup/teardown
    globals: true,
  },
});
