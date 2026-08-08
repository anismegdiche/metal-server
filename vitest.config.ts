import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const root = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: "@metal/server",
					root: `${root}apps/server`,
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
					root: `${root}packages/types`,
					include: ["**/__tests__/*.test.ts"],
					exclude: ["node_modules"],
					environment: "node",
					globals: true,
				},
			},
			{
				test: {
					name: "@metal/logger",
					root: `${root}packages/logger`,
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
					root: `${root}packages/utils`,
					include: ["**/__tests__/*.test.ts"],
					exclude: ["node_modules"],
					environment: "node",
					globals: true,
				},
			},
			{
				test: {
					name: "@metal/config",
					root: `${root}packages/config`,
					include: ["**/__tests__/*.test.ts"],
					exclude: ["node_modules"],
					environment: "node",
					globals: true,
				},
			},
			{
				test: {
					name: "@metal/persistent-map",
					root: `${root}packages/persistent-map`,
					include: ["**/__tests__/*.test.ts"],
					exclude: ["node_modules"],
					environment: "node",
					globals: true,
				},
			},
		],
	},
})
