// https://nuxt.com/docs/api/configuration/nuxt-config
/** biome-ignore-all lint/correctness/noUndeclaredVariables: <nuxt> */
export default defineNuxtConfig({
    compatibilityDate: '2026-06-30',

    modules: [
        '@nuxt/eslint',
        '@nuxt/ui',
        'nuxt-auth-utils'
    ],

    colorMode: {
        preference: 'light',
        fallback: 'light'
    },

    devtools: {
        enabled: true
    },

    devServer: {
        port: 5000
    },

    css: ['~/assets/css/main.css'],

    runtimeConfig: {
        metalServerUrl: process.env.NUXT_METAL_SERVER_URL ?? 'http://127.0.0.1:3000',
        public: {
            aiServerUrl: process.env.NUXT_PUBLIC_AI_SERVER_URL ?? 'http://localhost:3001'
        }
    },

    eslint: {
        config: {
            stylistic: {
                commaDangle: 'never',
                braceStyle: '1tbs'
            }
        }
    }
})
