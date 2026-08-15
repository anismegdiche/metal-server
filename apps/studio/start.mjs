//
//
//

//
try {
  process.loadEnvFile()
} catch {
  // no .env file, that's fine
}

process.env.PORT = process.env.STUDIO_PORT || 5000
process.env.HOST = process.env.HOST || '0.0.0.0'
process.env.NUXT_SERVER_ADDRESS = process.env.SERVER_ADDRESS || 'http://localhost:3000'

console.log(`ℹ️  Environment:`);
Object.entries(process.env).forEach(([key, value]) => {
    console.log(`ℹ️  - ${key}=${value}`);
});

await import('./.output/server/index.mjs')