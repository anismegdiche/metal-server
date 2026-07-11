// https://nuxt.com/docs/api/configuration/nuxt-config
/** biome-ignore-all lint/correctness/noUndeclaredVariables: <nuxt> */
export default defineNuxtConfig({
    compatibilityDate: '2026-06-30',

    modules: [
        '@nuxt/eslint',
        '@nuxt/ui'
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

    routeRules: {
        '/server-api/**': { proxy: 'http://localhost:3000/**' }
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
