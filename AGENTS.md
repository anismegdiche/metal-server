# Metal Server — Coding Conventions & Patterns

> **Monorepo (yarn workspaces).** Workspaces defined in root `package.json` `workspaces` field: `apps/*`, `packages/*`, `docs`. Use `yarn` for all package management. Use `workspace:*` protocol for inter-package dependencies. All paths in this file are relative to `apps/server/` unless noted.

## Project Overview

- **`apps/server/`** — Express-based TypeScript middleware/ETL/AI server using DuckDB (see `src/types/DataTable.ts`). REST API over multiple database/storage/web backends, plan-based ETL pipeline, Docker-based AI task execution. Includes a Model Context Protocol (MCP) server adapter.
- **`apps/studio/`** — Nuxt 4 / Vue 3 studio frontend (name: `@metal/studio`). Single `default.vue` layout with sidebar + header tabs, built on `@nuxt/ui` v4. All pages at root level (no `/studio/` prefix).
- **`apps/metrics/`** — ZeroMQ pub/sub metrics collection service (`@metal/metrics`).
- **`packages/config/`** — Shared config / env helpers (`@metal/config`).
- **`packages/logger/`** — Logging service with `LogFunction` decorator (`@metal/logger`).
- **`packages/types/`** — Shared types and zod schemas (`@metal/types`).
- **`packages/utils/`** — Shared utilities, `JsonUtils` / `StringUtils` / `Stringify` (`@metal/utils`).
- **`packages/messaging/`** — ZeroMQ-based pub/sub messaging with DI, decorators (`@metal/messaging`).
- **`packages/persistent-map/`** — LMDB-backed persistent map (`@metal/persistent-map`).
- **`docs/`** — VitePress documentation site (`@metal/docs`).
- **`examples/ai-server/`** — Standalone MCP server example (`@metal/ai-server`, not a workspace).
- **`examples/ai-chat/`** — Standalone Nuxt 4 chat example (not a workspace).

---

## 0. Workspace Conventions

### Package naming
- **Apps** use `@metal/<name>` scope (e.g., `@metal/server`, `@metal/metrics`). Exception: `docs` (unscoped / `@metal/docs`).
- **Packages** use `@metal/<name>` scope (e.g., `@metal/config`, `@metal/messaging`).
- Inter-package dependencies use `"workspace:*"` protocol — never pin local versions.

### Cross-package imports
- Packages expose entry points via `"exports"` field in their `package.json`. Import by package name, not relative path:
  ```ts
  import { Config } from "@metal/config"
  import { Publisher } from "@metal/messaging/publisher"
  import { Subscriber } from "@metal/messaging/subscriber"
  import { Stringify } from "@metal/utils/json-utils/stringify"
  ```
- `@metal/messaging` has **no root `"."` export** — always import its subpaths (`@metal/messaging/publisher`, `@metal/messaging/subscriber`, `@metal/messaging/registry`, `@metal/messaging/di/container`, `@metal/messaging/decorators/*`).
- `@metal/utils` exports `"."` plus subpaths `"./string-utils"`, `"./json-utils"`, `"./json-utils/stringify"`, `"./json-utils/to-text-list"`.
- Apps within `apps/` should **not** use relative imports to reach other apps or packages — always use the package name.
- If you need to add a new export from a package, add it to that package's `package.json` `"exports"` field.

### Building workspaces
- `yarn all:build:workspaces` (runs `yarn workspaces foreach -A run build`) builds all workspaces that have a `build` script (in dependency order).
- Each workspace manages its own `tsconfig.json`. To add a new dependency between workspaces, add `workspace:*` to the consumer's `package.json` dependencies.

### Linting & formatting
- **Biome** is configured at root (`biome.json`) and applies to `apps/server`. Server scripts (there is no `lint` script on the server — use these):
  ```sh
  yarn workspace @metal/server dev:lint          # biome lint --write src
  yarn workspace @metal/server dev:check         # biome check src
  yarn workspace @metal/server dev:format        # biome format --write src
  ```
- **Studio** uses ESLint (`@nuxt/eslint`): `yarn workspace @metal/studio dev:lint` (`eslint .`) and `yarn workspace @metal/studio dev:typecheck` (`nuxt typecheck`).
- Biome is not a root dependency — run Biome through `yarn workspace @metal/server <script>`.

### Studio page structure
- **Single layout**: `app/layouts/default.vue` — `UDashboardGroup` + `UDashboardSidebar` + `UDashboardNavbar` with conditional header tabs (login page opts out via `definePageMeta({ layout: false })`)
- **Auth**: global middleware `app/middleware/auth.global.ts` redirects to `/login` when unauthenticated; session handled via `nuxt-auth-utils` with server-side proxy routes (`server/api/login.post.ts`, `server/routes/server-api/[...].ts`)
- **Routes** (all at root level):
  - Sidebar: Dashboard `/dashboard`, Data `/data`, MCP Tools `/data/mcp-tools`, Designer `/designer`, Scheduler `/scheduler`, Config `/config/info`, Logs `/logs`, API Docs `/docs`
  - Dashboard tabs: `/dashboard`, `/dashboard/http`, `/dashboard/sources`, `/dashboard/schemas`, `/dashboard/plans`, `/dashboard/schedules`
  - Config tabs: `/config/info`, `/config/server`, `/config/users`, `/config/api-keys`
- **Folder pattern**: Each sidebar item is a folder (e.g., `pages/dashboard/index.vue`, `pages/config/info.vue`)
- **UI stack**: `@nuxt/ui` v4, Tailwind CSS v4, iconify `i-lucide-*` icons
- **Static data**: Pages use static `ref()` data during layout development — API integration comes later

---

## 1. Module Structure (Every Feature Module Follows This)

```
src/modules/<module>/
  @consts.ts          — string enums (DATA_PROVIDER, STEP, STORAGE_TYPE, AUTH_PROVIDER, AI_ENGINE, etc.)
  @types.ts           — module-level types (when types/ dir is not needed)
  <Module>.ts         — main class (factory or controller)
  _hook.ts            — exports RegisterMiddleware() → registers an Express router via ServerEndpoint
  base/
    I<Module>.ts      — interface
    abs<Module>.ts    — abstract base class
  providers/          — concrete implementations (source/storage/auth/content/webservice)
  consts/             — sub-constant files for complex modules (plan, ai-engine)
  engine/             — AI engine classes (ai-engine only)
  docker-services/    — Docker service classes (ai-engine only)
  steps/              — plan step implementations (plan only)
  routes/             — Express Router definitions
  response/           — Response classes mapping routes → module methods
  types/              — zod schemas + inferred types (named `z_U__*` / `U__*`), or `TSchemaRequest*` / `T_*` types
  __tests__/          — Vitest tests (co-located)
```

Repeating files across modules (same naming) is normal and intentional.

**Actual modules in `src/modules/`:** `ai-engine`, `api`, `apikey`, `auth`, `cache`, `content`, `core`, `errors`, `mcp`, `metrics`, `plan`, `sandbox`, `schema`, `source`, `storage`, `webservice`.

| Module     | base/             | providers/                      | routes/        | response/ | __tests__/ |
| ---------- | ----------------- | ------------------------------- | -------------- | --------- | ---------- |
| ai-engine  | I + abs           | `engine/` + `docker-services/`  | —              | —         | yes        |
| api        | —                 | —                               | yes            | yes       | —          |
| apikey     | —                 | —                               | yes            | yes       | yes        |
| auth       | I + abs           | yes (demo/local/oidc)           | via `_hook.ts` | —         | yes        |
| cache      | —                 | —                               | yes            | yes       | yes        |
| content    | I + abs           | yes (csv/json/xlsx/xml/parquet) | —              | —         | yes        |
| core       | IConfigStore only | —                               | yes            | yes       | yes        |
| errors     | —                 | —                               | —              | —         | yes        |
| mcp        | —                 | —                               | yes            | —         | yes        |
| metrics    | —                 | —                               | yes            | yes       | —          |
| plan       | —                 | —                               | yes            | yes       | yes        |
| sandbox    | —                 | —                               | —              | —         | yes        |
| schema     | —                 | —                               | yes            | yes       | yes        |
| source     | I + abs           | yes                             | —              | —         | yes        |
| storage    | I + abs           | yes                             | —              | —         | yes        |
| webservice | I + abs           | yes (rest/soap)                 | —              | —         | yes        |

---

## 2. Code Style & TypeScript

- **ESM** modules (`"type": "module"` in package.json; `format: ["esm"]` via tsup for the server)
- **Relative imports only** for intra-app code — no path aliases (`@/` etc.); cross-workspace code uses package names (see §0)
- Use `type` keyword for type-only imports: `import type { X } from "./path"` (required by `verbatimModuleSyntax: true`)
- **Strict TS** — shared in root `tsconfig.common.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `esModuleInterop: true`, `skipLibCheck: true`
- **Decorators enabled** — `experimentalDecorators: true`, `emitDecoratorMetadata: true`
- **Biome** for linting + formatting (see §0). Formatter: `indentStyle: tab`, `lineWidth: 120`, `quoteStyle: double`, `semicolons: "asNeeded"`, `bracketSpacing: true`
- No semicolons (Biome `asNeeded` default)
- Each workspace manages its own `tsconfig.json` — root-level settings may vary per workspace

## 3. Naming Conventions

| Kind                      | Convention                     | Examples                                                                                                    |
| ------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Enums                     | ALL_CAPS_SNAKE                 | `DATA_PROVIDER.POSTGRES`, `STEP.SELECT`, `STEP_STATUS.SUCCESS`, `STORAGE_TYPE.AWS_S3`, `AUTH_PROVIDER.OIDC` |
| Zod schemas (plan/global) | `z_U__<scope>_<name>`          | `z_U__plans_plan`, `z_U__plans_plan_insert_Params`                                                          |
| Inferred types            | `U__<scope>_<name>`            | `U__plans_plan`, `U__plans_plan__step`                                                                      |
| Config/engine schemas     | `z_T__<name>` / `T__<name>`    | `z_T__ai_engines_ai_engine`, `z_T__ai_engines`                                                              |
| Schema request types      | `TSchemaRequest<Op>`           | `TSchemaRequestSelect`, `TSchemaRequestInsert`                                                              |
| Other types               | PascalCase with `T_` prefix    | `T_StepResult`, `T_StepErrorDetails`, `TContext`, `TInternalResponse`                                       |
| Private helpers           | underscore prefix              | `_schemaOperation()`, `_insertPlan()`                                                                       |
| Row-level step fns        | `_<stepName>Row`               | `_insertRow()`, `_pickRow()`, `_anonymizeRow()`, `_mapRow()`                                                |
| Constants files           | `@consts.ts`                   | `src/modules/plan/@consts.ts`                                                                               |
| Params directories        | `U__plans_params/`             | Under `src/modules/plan/types/`                                                                             |
| Module `_hook.ts`         | exports `RegisterMiddleware()` | `src/modules/api/_hook.ts`                                                                                  |

## 4. DataTable Usage

`DataTable` (`src/types/DataTable.ts`) is the universal data container — wraps DuckDB in-memory (optionally persistent/encrypted on disk):

```ts
import { DataTable } from "../../types/DataTable"
import type { TRow, TFields, TMetaData, TOrderBy } from "../../types/DataTable"

// Construction
const dt = new DataTable("name")                                              // empty
const dt = new DataTable("name", [{ col: "val" }])                            // with rows
const dt = new DataTable("name", rows, metaData, { persistent: true, batchSize: 100 })

// Reading
await dt.Rows()                       // get all rows; options: { includeIndex, fields, filter, skip, limit, sort, fnMap, fnFilter }
await dt.Count()                      // row count
dt.Fields                             // field-name → type map (sync getter)
await dt.FieldsSet()                  // (re)compute fields from first row
dt.GetFieldNames()                    // field names (sync)
await dt.GetFieldValues<T>("field")   // column values
await dt.RowsIterator({ batchSize })  // memory-efficient lazy streaming iterator
await dt.ForEach(fn, params)          // iterate (concurrent)
await dt.FreeSql({ sqlQuery, returnData }) // run raw DuckDB SQL on this table

// Writing
await dt.RowsSet(rows)                // replace all
await dt.RowsAdd(rows)                // append
await dt.RowsUpdate(row, condition?)  // update rows matching condition
await dt.RowsDelete(condition?)       // delete rows (condition is DataTable SQL filter)
await dt.RowsMap(fnMap, condition?)   // transform each row in place (return undefined to skip)
await dt.Sort({ field: "asc" | "desc" })
await dt.Pick(fields) / dt.Omit(fields)
await dt.Copy(name?, params?)         // copy to a new DataTable

// Snapshots + lifecycle
await dt.SnapshotSave(name) / SnapshotLoad(name) / SnapshotDelete(name) / SnapshotList() / SnapshotExists(name)
await dt.MoveToDisk()                 // persist in-memory table to encrypted disk
dt.Dispose()                          // close DuckDB + delete persistent file
```

- System fields are prefixed with `__` — `DT_SYS_FIELDS`: `__seq__`, `__idx__`, `__data__`, `__deleted__`, `__created_at__`.
- Exported helpers: `DATATABLES_PATH`, `DATATABLE_SYS_FIELDS`, `SORT_ORDER`, `dataTable_convertSql()`, `dataTable_fieldIsSystem()`, `duckDb_Sql_CreateTable()`, `z_TRow`, `z_TOrderBy`.

## 5. Step Implementation Pattern (Plans)

All steps in `src/modules/plan/steps/` (see `Insert.ts` for a full reference) follow this template:

```ts
import { JsonUtils } from "@metal/utils"
import { merge, omit } from "lodash-es"
import type { DataTable, TRow } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { Schema } from "../../schema/Schema"
import type { TSchemaRequestInsert } from "../../schema/types/TSchemaRequest"
import { STEP } from "../@consts"
import { DATAPROVIDER } from "../consts/DATAPROVIDER"
import { type U__plans_plan_insert_Params, z_U__plans_plan_insert_Params } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"

export async function StepName(stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<DataTable> {
  // 1. Validate params with Zod
  Assert.Var<U__plans_plan_stepName_Params>(
    stepParams,
    z_U__plans_plan_stepName_Params.safeParse(stepParams).success,
    `${STEP.STEPNAME}: Wrong argument passed ${JsonUtils.Stringify(stepParams)}`,
  )

  // 2. Evaluate ${{ }} JS placeholders via vm2 Sandbox
  const $__stepParams = PlaceHolder.EvaluateJsCode<U__plans_plan_stepName_Params>(stepParams, new Sandbox($context))

  // 3. Pull the plan DataTable from context
  const { data: planData } = $context?.$plan as NonNullable<Record<string, unknown>>
  Assert.Var<DataTable>(planData, "Data is not initialized")

  // 4. Strip "on-error" before routing to schema
  const $__schemaRequest = omit($__stepParams, "on-error")

  // 5. Merge data-provider context (sets $schema/$entity/$options)
  $context = merge($context, DATAPROVIDER.GetContext($__schemaRequest))

  // 6. Route: schema (external backend) or in-memory plan operation
  const { schema } = $__schemaRequest
  if (schema) {
    await _schemaOperation($__schemaRequest, $context)
    return planData
  }
  return _planOperation($__schemaRequest, $context)
}

// Private helpers (non-exported, underscore-prefixed)
async function _schemaOperation(stepParams: ..., $context: ...): Promise<void> { ... }
async function _planOperation(stepParams: ..., $context: ...): Promise<DataTable> { ... }

// Row-level function (exported only when the step supports `scope: row`)
export function _stepNameRow(row: TRow, stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<TRow> { ... }
```

- `DATAPROVIDER` (`consts/DATAPROVIDER.ts`) is a shared `new MemoryData()` whose `GetContext(schemaRequest)` returns `{ $schema, $entity, $options }`.
- Row-level functions: `_insertRow`, `_pickRow`, `_runRow`, `_anonymizeRow`, `_omitRow`, `_mapRow`, `_removeEmptyFieldsRow`. Steps without them (Select, Update, Delete, Join, Sync, Sort, ...) don't support `scope: row`.

**Registration in `Step.ts` (`ExecuteCaseMap`):**
```ts
// Flow functions aren't wrapped: Break returns a signal (STEP_SIGNAL.STOP/NEXT)
[STEP.BREAK]: async (stepParams, $context) => { ... }

// Data functions are wrapped; pass a second row function only if `scope: row` is supported
[STEP.INSERT]: Step.WrapStepWithSignal(
  async (stepParams, $context) => (await import("./steps/Insert")).Insert(stepParams, $context),
  async (row, stepParams, $context) => (await import("./steps/Insert"))._insertRow(row, stepParams, $context),
),
// STEP.FIELDS maps to steps/Pick
[STEP.FIELDS]: Step.WrapStepWithSignal(
  async (stepParams, $context) => (await import("./steps/Pick")).Pick(stepParams, $context),
  async (row, stepParams, $context) => (await import("./steps/Pick"))._pickRow(row, stepParams, $context),
),
```

`WrapStepWithSignal(fnStep, fnRow?, signal = STEP_SIGNAL.NEXT)` emits `PLAN_METRICS.STEP_START`/`STEP_END` events, routes through `Step.OnError()` when `on-error` params exist, and returns a `T_StepResult` `{ data, signal, outcome, $context, error? }`.

`STEP` enum (in `src/modules/plan/@consts.ts`): `DEBUG, SELECT, UPDATE, DELETE, INSERT, JOIN, FIELDS, SORT, RUN, SYNC, ANONYMIZE, REMOVE_DUPLICATE, LIST_ENTITIES, BREAK, PICK, OMIT, MAP, SET_VAR, CLEAR, REMOVE_EMPTY_FIELDS`.

## 6. Provider Factory Pattern

Every provider type (data, storage, auth, content, webservice, AI engine) uses this lazy-loading factory:

```ts
// Factory with deduplication (src/modules/source/DataProvider.ts)
type ProviderLoader = () => Promise<{ new (): IDataProvider }>
type ProviderMap = { [key in DATA_PROVIDER]: ProviderLoader }

export class DataProvider {
  static readonly #dataFactory = new Factory<IDataProvider>()
  static readonly #loadingPromises = new Map<DATA_PROVIDER, Promise<IDataProvider>>()

  static readonly #providerMap: ProviderMap = {
    [DATA_PROVIDER.POSTGRES]: () => import("./providers/PostgresData").then((m) => m.PostgresData),
    [DATA_PROVIDER.STORAGE]: () => import("./providers/StorageData").then((m) => m.StorageData),
    // ...
  }

  static async GetProvider(providerName: DATA_PROVIDER): Promise<IDataProvider> {
    if (this.#dataFactory.Has(providerName)) return this.#dataFactory.Get(providerName)!.Clone()
    const existingPromise = this.#loadingPromises.get(providerName)
    if (existingPromise) return existingPromise.then((p) => p.Clone())

    const providerLoader = this.#providerMap[providerName]
    if (!providerLoader) throw new HttpErrorNotFound(`Data Provider '${providerName}' not found`)

    const loadPromise = (async () => {
      try {
        const ProviderClass = await providerLoader()
        const provider = new ProviderClass()
        this.#dataFactory.Register(providerName, provider)  // register AFTER successful instantiation
        return provider
      } finally {
        this.#loadingPromises.delete(providerName)           // clean up in finally
      }
    })()
    this.#loadingPromises.set(providerName, loadPromise)
    const provider = await loadPromise
    return provider.Clone()
  }
}
```

Key rules:
- Use `Clone()` before returning — never share a provider instance (data/storage/content/webservice). **Exceptions:** `AuthProvider` and `AiEngine` return shared instances.
- Register in factory **after** successful instantiation
- Clean up loading promise in `finally`
- `StorageProvider` uses `Factory<Promise<IStorageProvider>>` (the factory itself holds promises)
- `ContentProvider` uses a `Record<CONTENT, { import: () => Promise<new () => IContentProvider> }>` map
- Abstract base class extends `Mixin(clsClonable, clsContext)` for data providers

## 7. Abstract Base / Interface Pattern

```ts
// interface (I prefix) — extends clsClonable + clsContext
export interface IDataProvider extends clsClonable, clsContext {
  ProviderName: DATA_PROVIDER
  SourceName?: string
  Config: unknown
  Connection?: unknown
  Options: IDataProviderOptions

  Init(source: string, sourceConfig: U__sources_source): Promise<void>
  Connect(): Promise<void>
  Disconnect(): Promise<void>
  ListEntities(req: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>>
  AddEntity(req: TSchemaRequest): Promise<TInternalResponse<undefined>>
  Select(req: TSchemaRequestSelect): Promise<TInternalResponse<TSchemaResponse>>
  Insert(req: TSchemaRequestInsert): Promise<TInternalResponse<TSchemaResponse>>
  Update(req: TSchemaRequestUpdate): Promise<TInternalResponse<TSchemaResponse>>
  Delete(req: TSchemaRequestDelete): Promise<TInternalResponse<TSchemaResponse>>
  EscapeEntity(entity: string): string
  EscapeField(field: string): string
  GetSqlQuery(): SqlQueryUtils
  GenerateSqlSelect(): string
  GenerateSqlInsert(): string
  GenerateSqlUpdate(): string
  GenerateSqlDelete(): string
}

// abstract base (abs prefix) — mixin(clsClonable, clsContext)
export abstract class absDataProvider extends Mixin(clsClonable, clsContext) implements IDataProvider {
  abstract ProviderName: DATA_PROVIDER
  abstract SourceName?: string
  abstract Config: unknown
  abstract Connection?: unknown
  Options: IDataProviderOptions = new DataProviderOptions()
  // shared logic: GenerateSql*, CacheSet(), CacheRemove(), SetConfig()
}
```

Notes:
- `absStorageProvider`, `absContentProvider`, `absWebServiceProvider`, `absAiEngine` extend `clsClonable` directly (no `clsContext` mixin); `absAuthProvider` is a plain abstract class.
- `clsContext.GetContext(schemaRequest)` returns `{ $entity, $schema, $options }`.

## 8. Error Handling

- **`HttpErrorBase.ts`** defines the error classes (re-exported from `HttpErrors.ts`):
  - `HttpErrorBadRequest` (400), `HttpErrorUnauthorized` (401), `HttpErrorForbidden` (403), `HttpErrorNotFound` (404), `HttpErrorMethodNotAllowed` (405), `HttpErrorContentTooLarge` (413), `HttpErrorTooManyRequests` (429), `HttpErrorInternalServerError` (500), `HttpErrorNotImplemented` (501), `ConfigFileError`
- **Helpers**: `HttpErrorSwitch(status, message)` wraps a status code into the matching `HttpError`; `HttpErrorLog(e)` logs (Warn for 404, Error otherwise)
- **Assert pattern**: `Assert.Condition(condition, message, httpError?)` / `Assert.Var<T>(value, message, httpError?)` / `Assert.Get<T>(value, message)` / `Assert.ZodSchema<T>(value, zodSchema, message)`
- **Plan error handling**: `Step.OnError()` / `Step.OnErrorStep()` / `Step.OnErrorRow()` with:
  - Scopes — `STEP_ON_ERROR_SCOPE.STEP` (default) / `STEP_ON_ERROR_SCOPE.ROW` (routes via `onError.scope`)
  - Strategies — `STEP_ON_ERROR_STRATEGY.THROW` (rethrow), `STEP_ON_ERROR_STRATEGY.SKIP` (continue), `STEP_ON_ERROR_STRATEGY.RETRY` (retry with backoff), `STEP_ON_ERROR_STRATEGY.SINK` (write failed rows to a sink schema/entity, then mark them deleted)
  - Retry params — `attempts`, `delay`, `backoff` (`STEP_ON_ERROR_RETRY_BACKOFF.FIXED/LINEAR/EXPONENTIAL`), `max-delay`, `after-retries` (`THROW`/`SKIP`/`SINK`)
  - Error detail is injected into `$context.$error` as `T_StepErrorDetails` `{ message, type, timestamp, attempt, step }`
- **Always use `$context`** to pass error context — don't create new context objects

## 9. Dynamic Expressions (`${{ ... }}`)

All plan step params support JS expression evaluation:

```ts
// In every step:
const $__stepParams = PlaceHolder.EvaluateJsCode(stepParams, new Sandbox($context))
```

- `Sandbox` (`src/modules/sandbox/Sandbox.ts`) uses **vm2** `VM` with a 5s timeout and a blacklist of `maliciousPatterns` (blocks `require`, `child_process`, `process`, `fetch`, `eval`, prototype pollution, SQL injection, infinite loops, etc.)
- Available context variables (from `types/TContext.ts`):
  - `$schema`, `$entity`, `$options`, `$request`, `$row`, `$response`, `$plan` (name/currentStep/data), `$result`, `$vars`, `$error`
  - `$utils` = `{ JSON, Math, _ (lodash), newUuid }`

## 10. Testing Patterns (Vitest)

**Root-level config:** Vitest is configured centrally in the root `vitest.config.ts` using the `test.projects` API. Each workspace with tests is a separate project. Current projects: `@metal/server`, `@metal/types`, `@metal/logger`, `@metal/utils`, `@metal/config`, `@metal/persistent-map` (server + logger use `setupFiles: ["../../vitest.setup.ts"]` and `globals: true`).

**Commands:**
```sh
yarn vitest run                                 # run all workspace projects from the root
yarn workspace @metal/server test               # run only @metal/server tests
yarn workspace @metal/types test                # run only @metal/types tests
yarn workspace @metal/logger test               # run only @metal/logger tests
yarn workspace @metal/utils test                # run only @metal/utils tests
yarn workspace @metal/config test               # run only @metal/config tests
yarn workspace @metal/persistent-map test       # run only @metal/persistent-map tests
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
import type { TRow, TFields, TOrderBy } from "../../types/DataTable"

// Utils
import { Assert } from "../../utils/Assert"
import { Utils } from "../../utils/Utils"
import { PlaceHolder } from "../../utils/PlaceHolder"
import { Factory } from "../../utils/Factory"
import { RowUtils } from "../../utils/RowUtils"
import { VirtualFileSystem } from "../../utils/VirtualFileSystem"
import { clsClonable, clsContext } from "../../utils/base"

// Sandbox
import { Sandbox } from "../sandbox/Sandbox"
import type { TContext } from "../sandbox/types/TContext"

// Schema
import { Schema } from "../../schema/Schema"
import type { TSchemaRequestInsert, TSchemaRequestSelect } from "../../schema/types/TSchemaRequest"

// Errors
import { HttpErrorBadRequest, HttpErrorNotFound, HttpErrorSwitch } from "../errors/HttpErrors"

// lodash
import { merge, omit, has } from "lodash-es"
```

### Cross-workspace (shared packages)
```ts
import { Logger } from "@metal/logger"
import { JsonUtils, StringUtils } from "@metal/utils"
import { Stringify } from "@metal/utils/json-utils/stringify"
import type { TJson, TUuidv7, TAny } from "@metal/types"
import { Config, EnvGetDataTablesDataPath, EnvLogsDataPath } from "@metal/config"
import { Publisher } from "@metal/messaging/publisher"
import { Subscriber } from "@metal/messaging/subscriber"
import { Container, Injectable } from "@metal/messaging/di/container"
import { PersistentMap } from "@metal/persistent-map"
```

## 13. Authentication & Authorization

- **Providers**: `AUTH_PROVIDER` enum (`src/modules/auth/@consts.ts`) — `DEMO`, `LOCAL` (bcrypt), `OIDC` (openid-client). Lazy-loaded via `AuthProvider` factory (`Factory<Promise<IAuthProvider>>`, static `Provider` / `SetCurrent()`).
- **Permissions**: `AUTH_PERMISSION` enum — `ADMIN="a"`, `CREATE="c"`, `READ="r"`, `UPDATE="u"`, `DELETE="d"`, `LIST="l"`. Permission strings match `/^(?!.*(.).*\1)[crudla]{1,6}$/`.
- **Tokens**: `User` issues JWT (jsonwebtoken), 1h expiry, sessions stored in a `PersistentMap` at `EnvSessionsDataPath()`.
- **Checks**: `Roles.Init()/HasPermission()/CheckPermission(user, entity?, permission)` — throws `HttpErrorForbidden` on failure.
- Express Request augmented with `__METAL_CURRENT_USER` (type in `src/@types/express/index.d.ts`); guard via `RequestHandler.CheckRequestHasCurrentUser`.
- **API keys**: `src/modules/apikey/` — `sk_`-prefixed keys (32 bytes, sha256-hashed, stored in `PersistentMap` at `EnvApiKeysDataPath()`), accepted as Bearer tokens by `UserResponse.IsAuthenticated`.

## 14. Requests & Responses (API Layer)

- Request types: `TSchemaRequest*` in `src/modules/schema/types/TSchemaRequest.ts` (base + `Select/Insert/Update/Delete/ListEntities/AddEntity`); options include `fields`, `filter`, `filter-expression`, `sort`, `cache`, `anonymize`, `data`
- Response type: `TSchemaResponse` `{ schema, entity?, status, data: DataTable }` in `src/modules/schema/types/TSchemaResponse.ts`
- Internal response wrapper: `TInternalResponse<T>` `{ StatusCode, Body? }` in `src/modules/core/types/TInternalResponse.ts`
- Factories: `HttpResponse.Ok()` / `Created()` / `NoContent()`, converted via `Convert.InternalResponseToResponse()`
- Optional parameters: `TOptionalParameter` (`src/modules/source/@types.ts`) — `{ Fields?, Filter?, Sort?, Data?, Cache? }`
- Route paths centralized in the `ROUTE` enum in `src/modules/core/@consts.ts` (`/user`, `/schema`, `/mcp`, `/health`, `/api-docs`, `/api/server`, `/api/plan`, `/api/cache`, `/api/schedule`, `/api/metrics`, `/api/keys`)
- Admin REST API: `src/modules/api/` — config CRUD, logs, and source listing at `/api/*` (all admin-only)
- MCP: `src/modules/mcp/` — `McpAdapter` (maps MCP tools → `AUTH_PERMISSION` via `ACTION_TO_PERMISSION`), `McpToolsValidator`, enabled via `server.endpoints.enable-mcp`

## 15. Adding a New Data Provider

1. Create `apps/server/src/modules/source/providers/YourData.ts`
   - Extend `absDataProvider`
   - Implement abstract methods: `Init`, `Connect`, `Disconnect`, `ListEntities`, `AddEntity`, `Select`, `Insert`, `Update`, `Delete`, `EscapeEntity`, `EscapeField` (optionally override `GenerateSql*` / use `CacheSet`/`CacheRemove`)
   - Use `Assert` for validation, `HttpError*` for errors
2. Export the class
3. Add it to `DataProvider.#providerMap` in `apps/server/src/modules/source/DataProvider.ts`
4. Add enum value to `DATA_PROVIDER` in `apps/server/src/modules/source/@consts.ts`
5. Add a source config schema (`U__source_<name>.ts`) under `apps/server/src/modules/source/types/` if it introduces a new config shape
6. Add tests under `apps/server/src/modules/source/providers/__tests__/`

Existing providers: `PostgresData`, `MongoDbData`, `SqlServerData`, `MySqlData`, `CosmosDbData`, `MetalData`, `PlanData`, `MemoryData`, `WebServiceData`, `StorageData` (plus `StorageFilesData` / `StorageFoldersData` behind `STORAGE_MODE`).

## 16. Adding a New Storage Provider

1. Create `apps/server/src/modules/storage/providers/YourStorage.ts`
   - Extend `absStorageProvider`
   - Implement: `IsConfigValid`, `Init`, `Connect`, `Disconnect`, `FolderIsExist`, `FolderCreate`, `FolderListFolders`, `FolderListFiles`, `FileIsExist`, `FileRead` (returns `Readable`), `FileWrite`, `FileRename`, `FileDelete`
   - Concrete `SetConfig(sourceConfig)` (sets source + storage config then calls `Init`) and `GetMimeType(fileName?)` are provided by the base class
2. Register in `StorageProvider.#providerMap` in `apps/server/src/modules/storage/StorageProvider.ts`
3. Add enum value to `STORAGE_TYPE` in `apps/server/src/modules/storage/@consts.ts` (`STORAGE_TYPE`: `FILESYSTEM="fs"`, `FTP="ftp"`, `SFTP="sftp"`, `AZURE_BLOB="azure-blob"`, `AZURE_FILE="azure-file"`, `AZURE_DATALAKE_G2="azure-datalake"`, `AWS_S3="aws-s3"`)
4. Add a storage config schema (`U__storage_<name>.ts`) under `apps/server/src/modules/storage/types/`

Existing providers: `FsStorage`, `FtpStorage`, `SftpStorage`, `AzureBlobStorage`, `AzureFileStorage`, `AzureDataLakeStorage`, `AmazonS3Storage`.

## 17. Adding a New AI Engine

1. Add an `AI_ENGINE` enum value in `apps/server/src/modules/ai-engine/@consts.ts` (`AI_ENGINE`: `OCR`, `TEXT`, `IMAGE`, `AUDIO`, `DOCUMENT`)
2. Add a task constant file in `apps/server/src/modules/ai-engine/consts/` (e.g. `TEXT.ts` with `TEXT_TASK`, `OCR.ts` with `OCR_LANG`, `LANG.ts` with `LANG_ISO`, `IMAGE.ts` with `IMAGE_TASK`, `AUDIO.ts` with `AUDIO_TASK`, `DOCKER.ts` with the `DOCKER` const)
3. Create an engine class in `apps/server/src/modules/ai-engine/engine/` (e.g. `Text.ts`, `Image.ts`, `Ocr.ts`, `Audio.ts`) extending `absAiEngine implements IAiEngine`
4. Create a Docker service class in `apps/server/src/modules/ai-engine/docker-services/` (extends `BaseDockerService`; `TextDockerService`, `ImageDockerService`, `OcrDockerService`, `AudioDockerService`, `CaddyDockerService`)
5. Register in `AiEngine` factory (the `engineLoaders` map) or `AiBuilder`
6. Add config types `z_T__ai_engines_ai_engine` / `z_T__ai_engines` under `apps/server/src/modules/ai-engine/types/`

## 18. Configuration Files

- Main config: YAML at `apps/server/config/config.yml`, env at `apps/server/config/.env` (zod validated by `U_config` schema in `apps/server/src/modules/core/types/U_config.ts`)
- Config sections: `version`, `server`, `roles`, `users`, `sources`, `schemas`, `plans`, `schedules`, `ai-engines`, `mcp`
- Config loaded by `ConfigManager` (`ConfigFilePath="./config/config.yml"`) from `ConfigStore` (disk-cached); hot-reload via `POST /api/server/reload` / `POST /api/server/reload-plans`
- Runtime data paths come from `@metal/config` env helpers: `EnvGetDataTablesDataPath()` (`./data/tables`), `EnvLogsDataPath()`, `EnvSessionsDataPath()`, `EnvApiKeysDataPath()`, `EnvGetAiEnginesModelsPath()`, `EnvGetMetricsDataPath()`, `EnvGetMetricsTcpAddress()`, `EnvGetServerAddress()`, `EnvGetStudioHost()`, `EnvGetStudioPort()`

## 19. Adding a New Workspace

Root `workspaces` globs: `apps/*`, `packages/*`, and the literal `docs`.

### Adding a new `apps/` workspace

1. Create the app directory: `apps/<name>/`
2. Create `package.json` with:
   - `"name": "@metal/<name>"` (or plain `"<name>"` for non-scoped projects like studio)
   - `"type": "module"`
   - `"private": true`
   - `"scripts"` with a `"build"` script if it needs to be built
3. Add workspace dependencies using `"workspace:*"` protocol for `@metal/*` packages
4. Add `tsconfig.json` if TypeScript is used (extends root `tsconfig.common.json` or standalone)
5. If it has tests, add a project entry to root `vitest.config.ts` `test.projects` and a `"test"` script
6. If using Biome, run `yarn workspace @metal/<name> dev:check` to verify

### Adding a new `packages/` workspace

1. Create the package directory: `packages/<name>/`
2. Create `package.json` with:
   - `"name": "@metal/<name>"`
   - `"type": "module"`
   - `"private": true`
   - `"exports"` field defining public entry points (subpaths for multi-entry packages like `@metal/messaging` / `@metal/utils`)
   - `"scripts"` with `"build": "tsc"` and `"test"` if applicable
3. Add `tsconfig.json`
4. Reference from other workspaces via `"@metal/<name>": "workspace:*"`
5. If it has tests, add a project entry to root `vitest.config.ts` `test.projects` and a `"test"` script
