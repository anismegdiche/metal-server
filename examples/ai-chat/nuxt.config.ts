/** biome-ignore-all lint/correctness/noUndeclaredVariables: <nuxt> */
export default defineNuxtConfig({
  compatibilityDate: '2026-06-30',
  modules: ['@nuxt/ui'],
  css: [],
  devServer: { port: 5002 },
  runtimeConfig: {
    public: {
      aiServerUrl: process.env.NUXT_PUBLIC_AI_SERVER_URL ?? 'http://localhost:3001'
    }
  }
})
