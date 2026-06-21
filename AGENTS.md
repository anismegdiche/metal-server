# Metal Server — Coding Conventions & Patterns

> **2026-06-20: Migrated from npm to pnpm.** Use `pnpm` instead of `npm` for all package management commands. See `.npmrc` and `pnpm-workspace.yaml` at root.

## Project Overview
Metal Server is an Express-based TypeScript middleware/ETL/AI server using DuckDB as its in-memory tabular engine (see `src/types/DataTable.ts`). It exposes a unified REST API over multiple database, storage, and web service backends, with a plan-based ETL pipeline and Docker-based AI task execution.

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
- **Biome** for linting + formatting (run `pnpm lint` and `pnpm check`)
- No semicolons (Biome default is `"semicolons": "asNeeded"`)

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

## 11. Key Imports Reference

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

1. Create `src/modules/source/providers/YourData.ts`
   - Extend `absDataProvider`
   - Implement all abstract methods (`Connect`, `Disconnect`, `Select`, `Insert`, `Update`, `Delete`, `ListEntities`, `AddEntity`, `EscapeEntity`, `EscapeField`)
   - Use `Assert` for validation, `HttpError*` for errors
2. Export the class
3. Add it to `DataProvider.#providerMap` in `src/modules/source/DataProvider.ts`
4. Add enum value to `DATA_PROVIDER` in `src/modules/source/@consts.ts`

## 16. Adding a New Storage Provider

1. Create `src/modules/storage/providers/YourStorage.ts`
   - Extend `absStorageProvider`
   - Implement: `Init`, `Connect`, `Disconnect`, `FolderIsExist`, `FolderCreate`, `FolderListFolders`, `FolderListFiles`, `FileIsExist`, `FileRead`, `FileWrite`, `FileRename`, `FileDelete`
2. Register in `StorageProvider.#providerMap` in `src/modules/storage/StorageProvider.ts`
3. Add enum value to `STORAGE` in `src/modules/storage/@consts.ts`

## 17. Adding a New AI Engine

1. Add an `AITASK` enum value in `src/modules/ai-engine/@consts.ts`
2. Add engine type constant in `src/modules/ai-engine/consts/`
3. Create engine class in `src/modules/ai-engine/engine/`
4. Create Docker service class in `src/modules/ai-engine/docker-services/`
5. Register in `AiBuilder` or `AiEngine` factory

## 18. Configuration Files

- Main config: YAML (zod validated by `U_config` schema in `src/modules/core/U_config.ts`)
- Config sections: `version`, `server`, `roles`, `users`, `sources`, `schemas`, `plans`, `schedules`
- Config loaded by `ConfigManager` from `ConfigStore` (disk-cached)
