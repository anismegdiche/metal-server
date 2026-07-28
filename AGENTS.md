# Metal Server — Coding Conventions & Patterns

> **Monorepo (yarn workspaces).** Workspaces defined in root `package.json` `workspaces` field: `apps/*` and `packages/*`. Use `yarn` for all package management. Use `workspace:*` protocol for inter-package dependencies. All paths in this file are relative to `apps/server/` unless noted.

## Project Overview

- **`apps/server/`** — Express-based TypeScript middleware/ETL/AI server using DuckDB (see `src/types/DataTable.ts`). REST API over multiple database/storage/web backends, plan-based ETL pipeline, Docker-based AI task execution.
- **`apps/studio/`** — Nuxt 4 / Vue 3 studio frontend. Single `default.vue` layout with sidebar + header tabs. All pages at root level (no `/studio/` prefix).
- **`apps/metrics/`** — Metrics collection service (`@metal/metrics`).
- **`apps/ai-server/`** — MCP (Model Context Protocol) AI server (`@metal/ai-server`).
- **`packages/config/`** — Shared config handling (`@metal/config`).
- **`packages/logger/`** — Logging service (`@metal/logger`).
- **`packages/types/`** — Shared types and zod schemas (`@metal/types`).
- **`packages/utils/`** — Shared utilities (`@metal/utils`).
- **`packages/messaging/`** — ZeroMQ-based pub/sub messaging with DI, decorators (`@metal/messaging`).
- **`packages/persistent-map/`** — LMDB-backed persistent map (`@metal/persistent-map`).

---

## 0. Workspace Conventions

### Package naming
- **Apps** use `@metal/<name>` scope (e.g., `@metal/server`, `@metal/metrics`). Exception: `studio` (Nuxt project, no scope).
- **Packages** use `@metal/<name>` scope (e.g., `@metal/config`, `@metal/messaging`).
- Inter-package dependencies use `"workspace:*"` protocol — never pin local versions.

### Cross-package imports
- Packages expose entry points via `"exports"` field in their `package.json`. Import by package name, not relative path:
  ```ts
  import { Config } from "@metal/config"
  import { Publisher } from "@metal/messaging/publisher"
  ```
- Apps within `apps/` should **not** use relative imports to reach other apps or packages — always use the package name.
- If you need to add a new export from a package, add it to that package's `package.json` `"exports"` field.

### Building workspaces
- `yarn workspaces foreach -A yarn build` builds all workspaces that have a `build` script (in dependency order).
- Each workspace manages its own `tsconfig.json`. To add a new dependency between workspaces, add `workspace:*` to the consumer's `package.json` dependencies.

### Linting & formatting
- **Biome** is configured at root (`biome.json`) and applies to all workspaces. Run from root:
  ```sh
  yarn workspace @metal/server lint          # just server
  yarn workspaces foreach -A yarn lint       # all workspaces with a `lint` script
  ```
- **Studio** (Nuxt 4) uses ESLint (`@nuxt/eslint`) for linting — check `apps/studio/` for Nuxt-specific tooling.

### Studio page structure
- **Single layout**: `app/layouts/default.vue` — sidebar nav + header with conditional tabs
- **Routes**: All pages at root level: `/dashboard/*`, `/data`, `/designer`, `/scheduler`, `/config/*`, `/logs`, `/docs`
- **Folder pattern**: Each sidebar item is a folder (e.g., `pages/data/index.vue`, `pages/config/info.vue`)
- **Header tabs**: Dashboard, Data, and Config show sub-navigation tabs in the header bar
- **Static data**: Pages use static `ref()` data during layout development — API integration comes later

---

## 1. Module Structure (Every Feature Module Follows This)

```
src/modules/<module>/
  @consts.ts          — string enums (DATA_PROVIDER, STORAGE, STEP, etc.)
  @types.ts           — module-level types (if few) or omit if types/ dir used
  <Module>.ts         — main class (factory or controller)
  base/
    I<Module>.ts      — interface
    abs<Module>.ts    — abstract base class
  providers/          — concrete implementations
  types/              — zod schemas + inferred types (named `z_U__*` / `U__*`)
```

Repeating files across modules (same naming) is normal and intentional.

---

## 2. Code Style & TypeScript

- **ESM** modules (`"type": "module"` in package.json, all imports use `.js` extension in output)
- **Relative imports only** — no path aliases (`@/` etc.)
- Use `type` keyword for type-only imports: `import type { X } from "./path"`
- **Strict TS** — `strict: true`, `noUncheckedCheckedIndexAccess: true`
- **Decorators enabled** — `experimentalDecorators: true`
- **Biome** for linting + formatting (run `yarn lint` from root or `yarn workspace @metal/server lint`)
- No semicolons (Biome default is `"semicolons": "asNeeded"`)
- Each workspace manages its own `tsconfig.json` — root-level settings may vary per workspace

## 3. Naming Conventions

| Kind | Convention | Examples |
|------|-----------|---------|
| Enums | ALL_CAPS_SNAKE | `DATA_PROVIDER.POSTGRES`, `STEP.SELECT`, `STEP_STATUS.SUCCESS` |
| Zod schemas | `z_U__<scope>_<name>` | `z_U__plans_plan`, `z_U__plans_plan_select_Params` |
| Inferred types | `U__<scope>_<name>` | `U__plans_plan`, `U__plans_plan__step` |
| Other types | PascalCase with `T_` prefix | `T_StepResult`, `T_PlanMetrics`, `TContext` |
| Private helpers | underscore prefix | `_selectSchema()`, `_insertPlan()` |
| Row-level step fns | underscore prefix + `Row` | `_insertRow()`, `_updateRow()` |
| Constants files | `@consts.ts` | `src/modules/plan/@consts.ts` |
| Params directories | `U__plans_params/` | Under `src/modules/plan/types/` |

## 4. DataTable Usage

`DataTable` (`src/types/DataTable.ts`) is the universal data container — wraps DuckDB in-memory:

```ts
import { DataTable } from "../../types/DataTable"

// Construction
const dt = new DataTable("name")                          // empty
const dt = new DataTable("name", [{ col: "val" }])        // with rows

// Operations
await dt.RowsSet(rows)       // replace all
await dt.RowsAdd(rows)       // append
await dt.Rows()              // get all rows
await dt.Count()             // row count
await dt.RowsMap(fn)         // transform each row
dt.Fields                    // get field names (sync getter)
dt.GetFieldNames()           // get field names (async)
```

System fields are prefixed with `__` (`__seq__`, `__idx__`, `__data__`, `__deleted__`, `__created_at__`).

## 5. Step Implementation Pattern (Plans)

All steps in `src/modules/plan/steps/` follow this template:

```ts
// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <reason>
import { merge, omit } from "lodash-es"
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { Schema } from "../../schema/Schema"
import type { TSchemaRequestInsert } from "../../schema/types/TSchemaRequest"
import { STEP } from "../@consts"
import { DATAPROVIDER } from "../consts/DATAPROVIDER"
import { type U__plans_plan_insert_Params, z_U__plans_plan_insert_Params } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"

export async function StepName(stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<DataTable | undefined> {
  // 1. Validate params with Zod
  Assert.Var(stepParams, z_U__plans_plan_stepName_Params.safeParse(stepParams).success, "error message")

  // 2. Evaluate JS placeholders
  const $__stepParams = PlaceHolder.EvaluateJsCode(stepParams, new Sandbox($context))

  // 3. Extract plan data
  const { data: planData } = $context?.$plan ?? {}

  // 4. Remove "on-error" from params
  const $__schemaRequest = omit($__stepParams, "on-error")

  // 5. Update context with data provider info
  $context = merge($context, DATAPROVIDER.GetContext($__schemaRequest))

  // 6. Route: schema operation or in-memory plan operation
  if ($__schemaRequest.schema) {
    return await _schemaOperation($__schemaRequest, $context)
  }
  return await _planOperation($__schemaRequest, $context)
}

// Private helpers (non-exported, underscore-prefixed)
async function _schemaOperation(stepParams: ...): Promise<DataTable | undefined> { ... }
async function _planOperation(stepParams: ...): Promise<DataTable | undefined> { ... }

// Row-level function (exported, used by Step.ts WrapStepWithSignal)
export function _stepNameRow(row: TRow, stepParams: ..., $context: ...): Promise<TRow> { ... }
```

**Registration in Step.ts:**
```ts
// In src/modules/plan/Step.ts, ExecuteCaseMap:
[STEP.STEPNAME]: Step.WrapStepWithSignal(
  async (stepParams, $context) => (await import('./steps/StepName')).StepName(stepParams, $context),
  async (row, stepParams, $context) => (await import('./steps/StepName'))._stepNameRow(row, stepParams, $context)
),
```

The second arg (row-level function) is optional — only provide if the step supports `scope: row` error handling.

## 6. Provider Factory Pattern

Every provider type (data, storage, auth, content, webservice, AI engine) uses this lazy-loading factory:

```ts
// Factory with deduplication
export class SomethingProvider {
  static readonly #factory = new Factory<ISomething>()
  static readonly #loadingPromises = new Map<SOMETHING_TYPE, Promise<ISomething>>()

  static readonly #providerMap: ProviderMap = {
    [SOMETHING_TYPE.FOO]: () => import("./providers/FooSomething").then((m) => m.FooSomething),
    [SOMETHING_TYPE.BAR]: () => import("./providers/BarSomething").then((m) => m.BarSomething),
  }

  static async GetProvider(type: SOMETHING_TYPE): Promise<ISomething> {
    if (this.#factory.Has(type)) return this.#factory.Get(type).Clone()
    if (this.#loadingPromises.has(type)) return this.#loadingPromises.get(type).then(p => p.Clone())
    // ... lazy load, register, return Clone()
  }
}
```

Key rules:
- Use `Clone()` before returning — never share a provider instance
- Register in factory **after** successful instantiation
- Clean up loading promise in `finally`
- Abstract base class extends `Mixin(clsClonable, clsContext)` for data providers

## 7. Abstract Base / Interface Pattern

```ts
// interface (I prefix)
export interface IDataProvider {
  Init(source: string, config: U__sources_source): Promise<void>
  Connect(): Promise<void>
  Disconnect(): Promise<void>
  Select(req: TSchemaRequestSelect): Promise<TInternalResponse<TSchemaResponse>>
  // ...
}

// abstract base (abs prefix) — mixin(clsClonable, clsContext)
export abstract class absDataProvider extends Mixin(clsClonable, clsContext) implements IDataProvider {
  abstract ProviderName: DATA_PROVIDER
  abstract SourceName?: string
  abstract Config: unknown
  abstract Connection?: unknown
  Options: IDataProviderOptions = new DataProviderOptions()
  // shared logic...
}
```

## 8. Error Handling

- **Helper**: `NormalizeError(error)` wraps any thrown value into an `HttpError`
- **Error classes**: `HttpErrorBadRequest` (400), `HttpErrorNotFound` (404), `HttpErrorUnauthorized` (401), `HttpErrorInternalServerError` (500), etc. in `src/modules/errors/HttpErrors.ts`
- **Assert pattern**: `Assert.Condition(condition, message, errorInstance)` / `Assert.Var<T>(value, message, errorInstance)`
- **Plan error handling**: Use `Step.OnError()` / `Step.OnErrorStep()` / `Step.OnErrorRow()` with strategies:
  - `STEP_ON_ERROR_STRATEGY.THROW` — rethrow
  - `STEP_ON_ERROR_STRATEGY.SKIP` — skip and continue
  - `STEP_ON_ERROR_STRATEGY.RETRY` — retry with backoff
  - `STEP_ON_ERROR_STRATEGY.SINK` — write errors to sink table
- **Always use `$context`** to pass error context — don't create new context objects

## 9. Dynamic Expressions (`${{ ... }}`)

All plan step params support JS expression evaluation:

```ts
// In every step:
const $__stepParams = PlaceHolder.EvaluateJsCode(stepParams, new Sandbox($context))
```

Available context variables in expressions:
- `$schema`, `$entity`, `$request`, `$response`, `$row`, `$result`, `$vars`, `$error`
- `$utils` (lodash, JSON, Math, newUuid)

## 10. Testing Patterns (Vitest)

**Root-level config:** Vitest is configured centrally in the root `vitest.config.ts` using the `test.projects` API. Each workspace with tests is a separate project.

**Commands:**
```sh
yarn test                    # run all workspace projects
yarn test:server             # run only @metal/server tests
yarn test:types              # run only @metal/types tests
yarn test:logger             # run only @metal/logger tests
yarn test:watch              # watch mode for all projects
```

**Adding tests to a new workspace:** Add an inline project entry to `test.projects` in the root `vitest.config.ts` and a `"test": "vitest run --project <name>"` script to the workspace's `package.json`.

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { DataTable } from "../../../types/DataTable"
// ... imports

vi.mock("../../some/module", () => ({
  SomeClass: vi.fn().mockImplementation(() => ({ method: vi.fn() }))
}))

describe("FeatureName", () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe("methodName", () => {
    it("should do something", async () => {
      // Arrange
      const dt = new DataTable("test", [{ col: "val" }])
      // Act
      const result = await someFunction(params)
      // Assert
      expect(await result.Rows()).toEqual([{ col: "val" }])
      expect(result.Fields).toEqual({ col: "string" })
    })
  })
})
```

- Mock Node builtins with `vi.mock("node:fs", async () => ({ ...vi.importActual("fs") }))`
- Use `<T>` type assertions for partial mock objects
- Test both success and error paths
- Clean up DataTable instances in `afterEach` when reusing across tests

## 11. Key Imports Reference (Server)

### Internal (server-specific)
```ts
// Types
import { DataTable } from "../../types/DataTable"
import type { TRow } from "../../types/DataTable"

// Utils
import { Assert } from "../../utils/Assert"
import { Logger } from "../../utils/Logger"
import { Utils } from "../../utils/Utils"
import { JsonUtils } from "../../utils/JsonUtils"
import { PlaceHolder } from "../../utils/PlaceHolder"

// Sandbox
import { Sandbox } from "../sandbox/Sandbox"
import type { TContext } from "../sandbox/types/TContext"

// Schema
import { Schema } from "../../schema/Schema"

// Errors
import { HttpErrorBadRequest, HttpErrorNotFound, NormalizeError } from "../errors/HttpErrors"

// lodash
import { merge, omit, has } from "lodash-es"
```

### Cross-workspace (shared packages)
```ts
import { Config } from "@metal/config"
import { Publisher } from "@metal/messaging/publisher"
import { Subscriber } from "@metal/messaging/subscriber"
import { PersistentMap } from "@metal/persistent-map"
```

## 13. Authentication & Authorization

- Role-based with permissions: `c` (create), `r` (read), `u` (update), `d` (delete), `a` (admin), `l` (list)
- Auth provider returns a `TUserTokenInfo` with roles
- Check permissions via `Roles` utility
- Express Request augmented with `__METAL_CURRENT_USER`

## 14. Requests & Responses (API Layer)

- Request types: `TSchemaRequest*` in `src/modules/schema/types/TSchemaRequest.ts`
- Response type: `TSchemaResponse` in `src/modules/schema/types/TSchemaResponse.ts`
- Internal response wrapper: `TInternalResponse<T>` in `src/modules/core/types/TInternalResponse.ts`
- Factory: `HttpResponse.Success()`, `HttpResponse.Error()`
- Optional parameters: `TOptionalParameter` (filter, fields, sort, cache, data, filter-expression)

## 15. Adding a New Data Provider

1. Create `apps/server/src/modules/source/providers/YourData.ts`
   - Extend `absDataProvider`
   - Implement all abstract methods (`Connect`, `Disconnect`, `Select`, `Insert`, `Update`, `Delete`, `ListEntities`, `AddEntity`, `EscapeEntity`, `EscapeField`)
   - Use `Assert` for validation, `HttpError*` for errors
2. Export the class
3. Add it to `DataProvider.#providerMap` in `apps/server/src/modules/source/DataProvider.ts`
4. Add enum value to `DATA_PROVIDER` in `apps/server/src/modules/source/@consts.ts`

## 16. Adding a New Storage Provider

1. Create `apps/server/src/modules/storage/providers/YourStorage.ts`
   - Extend `absStorageProvider`
   - Implement: `Init`, `Connect`, `Disconnect`, `FolderIsExist`, `FolderCreate`, `FolderListFolders`, `FolderListFiles`, `FileIsExist`, `FileRead`, `FileWrite`, `FileRename`, `FileDelete`
2. Register in `StorageProvider.#providerMap` in `apps/server/src/modules/storage/StorageProvider.ts`
3. Add enum value to `STORAGE` in `apps/server/src/modules/storage/@consts.ts`

## 17. Adding a New AI Engine

1. Add an `AITASK` enum value in `apps/server/src/modules/ai-engine/@consts.ts`
2. Add engine type constant in `apps/server/src/modules/ai-engine/consts/`
3. Create engine class in `apps/server/src/modules/ai-engine/engine/`
4. Create Docker service class in `apps/server/src/modules/ai-engine/docker-services/`
5. Register in `AiBuilder` or `AiEngine` factory

## 18. Configuration Files

- Main config: YAML (zod validated by `U_config` schema in `apps/server/src/modules/core/U_config.ts`)
- Config sections: `version`, `server`, `roles`, `users`, `sources`, `schemas`, `plans`, `schedules`
- Config loaded by `ConfigManager` from `ConfigStore` (disk-cached)

## 19. Adding a New Workspace

### Adding a new `apps/` workspace

1. Create the app directory: `apps/<name>/`
2. Create `package.json` with:
   - `"name": "@metal/<name>"` (or plain `"<name>"` for non-scoped projects like studio)
   - `"type": "module"`
   - `"private": true`
   - `"scripts"` with a `"build"` script if it needs to be built
3. Add workspace dependencies using `"workspace:*"` protocol for `@metal/*` packages
4. Add `tsconfig.json` if TypeScript is used (extends root or standalone)
5. Add it to root `package.json` `workspaces` field if needed — already covered by `apps/*` glob
6. If using Biome, run `yarn workspace @metal/<name> lint` to verify

### Adding a new `packages/` workspace

1. Create the package directory: `packages/<name>/`
2. Create `package.json` with:
   - `"name": "@metal/<name>"`
   - `"type": "module"`
   - `"private": true`
   - `"exports"` field defining public entry points
   - `"scripts"` with `"build": "tsc"`
3. Add `tsconfig.json`
4. Reference from other workspaces via `"@metal/<name>": "workspace:*"`
