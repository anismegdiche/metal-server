//
//
//
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
//
import youDontNeedLodashUnderscore from "eslint-plugin-you-dont-need-lodash-underscore";
import unusedImports from "eslint-plugin-unused-imports";
import security from "eslint-plugin-security";
import lodash from "eslint-plugin-lodash";


//
export default defineConfig([
    tseslint.configs.recommended,
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
        plugins: {
            js,
            "you-dont-need-lodash-underscore": youDontNeedLodashUnderscore,
            security,
            "unused-imports": unusedImports,
            lodash
        },
        extends: [
            "js/recommended"
        ],
        languageOptions:
        {
            globals: globals.browser
        },
        rules: {
            ...youDontNeedLodashUnderscore.configs["all-warn"].rules,
            ...security.configs.recommended.rules,
            ...Object.fromEntries(
                Object.keys(lodash.configs.recommended.rules)
                  .filter(rule => rule.startsWith("lodash/prefer-"))
                  .map(rule => [rule, "off"])
            ),
            ...tseslint.configs.recommended.rules,
            ///
            "unused-imports/no-unused-imports": "warn",
            "unused-imports/no-unused-vars": [
                "warn",
                {
                    "vars": "all",
                    "varsIgnorePattern": "^_",
                    "args": "after-used",
                    "argsIgnorePattern": "^_",
                },
            ],
            "lodash/import-scope": "warn",
            "no-unused-vars": "off",
            "no-undef": "off",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": "off"
        }
    }    
]);
