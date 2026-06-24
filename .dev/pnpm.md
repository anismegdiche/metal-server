**Key pnpm commands moving forward (monorepo with server at `apps/server/`):**
- `pnpm install` — install all dependencies
- `pnpm build` — build `@metal/server` (via `--filter`)
- `pnpm -r build` — build all workspaces
- `pnpm add lodash` — add dependency (run in workspace dir or with `--filter`)
- `pnpm add -D typescript` — add dev dependency
- `pnpm test` — run vitest for `@metal/server`
- `pnpm lint` — run biome lint for `@metal/server`
- `pnpm --filter @metal/server <script>` — run script in server workspace