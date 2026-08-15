import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { defineConfig } from "tsup"

//
const modulesPath = "src/modules"
const entry: Record<string, string> = { index: "src/index.ts" }

for (const dirent of readdirSync(modulesPath, { withFileTypes: true })) {
	if (!dirent.isDirectory()) continue
	const hookPath = join(modulesPath, dirent.name, "_hook.ts")
	if (existsSync(hookPath)) {
		entry[`modules/${dirent.name}/_hook`] = hookPath
	}
}

export default defineConfig({
	entry,
	format: ["esm"],
	target: "node24",
	outDir: ".output",
	splitting: true,
	sourcemap: true,
	clean: true,
	noExternal: [/^@metal\//],
})
