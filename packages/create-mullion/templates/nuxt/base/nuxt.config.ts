// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: '2026-01-20',

  devtools: {enabled: true},

  // Global CSS - works for both minimal and Nuxt UI
  css: ['~/assets/css/main.css'],

  // Nitro server configuration
  nitro: {
    preset: 'node-server',
  },

  // TypeScript configuration
  typescript: {
    strict: true,
    typeCheck: true,
  },

  // Runtime config for environment variables
  runtimeConfig: {
    // Server-only (not exposed to client)
    // Automatically populated from NUXT_OPENAI_API_KEY and NUXT_ANTHROPIC_API_KEY env vars
    openaiApiKey: '',
    anthropicApiKey: '',
    openaiStrictJsonSchema: true,

    // Public (exposed to client) - add any public config here if needed
    public: {},
  },
});
