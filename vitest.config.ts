import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: "@metal/server",
					root: "./apps/server",
					include: ["**/__tests__/*.test.ts", "**/?(*.)+(spec|test).ts"],
					exclude: ["node_modules", "build", "dist"],
					environment: "node",
					testTimeout: 120_000,
					clearMocks: true,
					globals: true,
					setupFiles: ["../../vitest.setup.ts"],
				},
			},
			{
				test: {
					name: "@metal/types",
					root: "./packages/types",
					include: ["**/__tests__/*.test.ts"],
					exclude: ["node_modules"],
					environment: "node",
					globals: true,
				},
			},
			{
				test: {
					name: "@metal/logger",
					root: "./packages/logger",
					include: ["**/__tests__/*.test.ts"],
					exclude: ["node_modules"],
					environment: "node",
					globals: true,
					setupFiles: ["../../vitest.setup.ts"],
				},
			},
			{
				test: {
					name: "@metal/utils",
					root: "./packages/utils",
					include: ["**/__tests__/*.test.ts"],
					exclude: ["node_modules"],
					environment: "node",
					globals: true,
				},
			},
		],
	},
})
