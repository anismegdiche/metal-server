// start.mjs
import 'dotenv/config' // loads .env, needs `npm i dotenv`

process.env.PORT = process.env.STUDIO_PORT || 5000
process.env.HOST = process.env.HOST || '0.0.0.0'

await import('./.output/server/index.mjs')