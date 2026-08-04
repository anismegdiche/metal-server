// https://nuxt.com/docs/api/configuration/nuxt-config
/** biome-ignore-all lint/correctness/noUndeclaredVariables: <nuxt> */
import {EnvGetServerAddress} from '@metal/config'


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
        metalServerUrl: EnvGetServerAddress(),
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
