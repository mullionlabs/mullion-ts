// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',

  // Extend the demo-base layer
  extends: ['../demo-base'],

  devtools: {enabled: true},

  app: {
    head: {
      title: 'Mullion RAG Demo',
      meta: [
        {charset: 'utf-8'},
        {name: 'viewport', content: 'width=device-width, initial-scale=1'},
        {
          name: 'description',
          content:
            "Demonstration of Mullion's fork/merge patterns and access control in a RAG system with sensitive data",
        },
      ],
    },
  },
});
