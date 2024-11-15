import typescriptEslint from "@typescript-eslint/eslint-plugin"
import unusedImports from "eslint-plugin-unused-imports"
import globals from "globals"
import tsParser from "@typescript-eslint/parser"
import path from "node:path"
import { fileURLToPath } from "node:url"
import js from "@eslint/js"
import { FlatCompat  } from "@eslint/eslintrc"
import * as Fs from 'fs'


// eslint-disable-next-line no-redeclare
const __filename = fileURLToPath(import.meta.url)
// eslint-disable-next-line no-redeclare
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
})

const config = JSON.parse(Fs.readFileSync('./.eslintrc.json', 'utf8'))

export default [
    {
        ignores: ["node_modules/**/*", "build/**/*", "**/.vscode"]
    }, ...compat.extends(
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:you-dont-need-lodash-underscore/compatible"
    ), {
        plugins: {
            "@typescript-eslint": typescriptEslint,
            "unused-imports": unusedImports
        },

        languageOptions: {
            globals: {
                ...Object.fromEntries(Object.entries(globals.browser).map(([key]) => [key, "off"])),
                ...globals.commonjs,
                ...globals.node
            },

            parser: tsParser,
            ecmaVersion: "latest",
            sourceType: "commonjs"
        },

        rules: config?.rules
    }
]