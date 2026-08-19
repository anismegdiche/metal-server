// https://nuxt.com/docs/api/configuration/nuxt-config
/** biome-ignore-all lint/correctness/noUndeclaredVariables: <nuxt> */
import { EnvGetServerAddress, EnvGetStudioHost, EnvGetStudioPort } from '@metal/config'


//
process.env.PORT = EnvGetStudioPort()
process.env.HOST = EnvGetStudioHost()
//
export default defineNuxtConfig({
    compatibilityDate: '2026-06-30',

    modules: [
        '@nuxt/eslint',
        '@nuxt/ui',
        'nuxt-auth-utils'
    ],
    vite: {
        optimizeDeps: {
            include: [
                '@vue-flow/background',
                '@vue-flow/controls',
                '@vue-flow/core',
                '@vue-flow/minimap',
                '@vue/devtools-core',
                '@vue/devtools-kit',
            ]
        }
    },

    runtimeConfig: {
        serverAddress: EnvGetServerAddress(),
    },

    nitro: {
        output: {
            dir: process.env.NODE_ENV === 'development' ? '.output-dev' : '.output',
        },
    },

    eslint: {
        config: {
            stylistic: {
                commaDangle: 'never',
                braceStyle: '1tbs'
            }
        }
    },

    devtools: {
        enabled: true
    },

    devServer: {
        port: 5000
    },

    css: ['~/assets/css/main.css'],

    colorMode: {
        preference: 'light',
        fallback: 'light'
    },
    fonts: {
        families: [
            {
                name: 'JetBrains Mono',
                provider: 'google', // or 'local' if self-hosted
                weights: [100, 200, 300, 400, 500, 600, 700, 800],
            }
        ]
    }
})
