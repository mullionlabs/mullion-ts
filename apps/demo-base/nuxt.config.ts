import { join } from 'path';
import { createResolver } from 'nuxt/kit';

const { resolve } = createResolver(import.meta.url);
const currentDir = resolve('./');

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',

  // Extend as a Nuxt Layer
  extends: [],

  modules: ['@nuxt/ui', 'nuxt-auth-utils'],

  // CSS imports are handled by each app extending this layer
  css: [join(currentDir, './app/assets/css/main.css')],

  runtimeConfig: {
    oauth: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      },
    },
    session: {
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },

  // Nuxt 4 uses app/ directory by default
  // All application code is now in app/ directory

  devtools: { enabled: true },

  typescript: {
    strict: true,
    typeCheck: false, // Disabled for build performance
  },
});
