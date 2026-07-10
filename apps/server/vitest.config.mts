/// <reference types="vitest/globals" />

import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: [
            "**/__tests__/*.test.ts",
            "**/?(*.)+(spec|test).ts",
        ],
        exclude: [
            "node_modules",
            "build",
            "dist",
        ],
        testTimeout: 120_000,
        clearMocks: true,
        setupFiles: ['vitest.setup.ts'],
        globals: true,
        testNamePattern: undefined, // force-reset any inherited pattern
    },
});
