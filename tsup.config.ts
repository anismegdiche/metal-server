import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    target: 'node24',
    outDir: 'dist',
    splitting: true,
    sourcemap: true,
    clean: true
})
