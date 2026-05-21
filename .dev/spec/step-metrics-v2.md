# Step Metrics Specification v2 — Event-Driven Metrics

## Status: Implemented

## Overview

Metrics are no longer embedded in return types. `TRowResult` has been eliminated, `T_StepResult.metrics` has been removed, and all metrics are accumulated via a central **`PlanMetrics`** class using `@dimkl/events` `EventBus`.

The old pattern threaded `TRowResult` with `metrics: Partial<T_StepRowMetrics>` through every error handler (`OnErrorRow`, `_onErrorRowSkip`, `_onErrorRowSink`, `_onErrorRowRetry`). Now these functions return plain `TRow` or `DataTable`, and `PlanMetrics` accumulates metrics from `CustomEvent` dispatches.

---

## 1. Event Bus Architecture

- Uses `@dimkl/events` `EventBus` — **isolated** instance on `PlanMetrics.Bus`
- No `@dispatch` decorator used. Events are dispatched imperatively via `PlanMetrics.Bus.dispatchEvent(new CustomEvent(...))`
- Handlers subscribe via `@on({ eventName, eventBus: PlanMetrics.Bus })` decorators on `PlanMetrics` static methods
- Metrics are stored in `PlanMetrics.Metrics: Map<string, T_PlanMetrics | undefined>`, keyed by plan name
- The `Plan.Metrics` getter reads from this map: `PlanMetrics.Metrics.get(this.Name)`

---

## 2. Event Schema

### 2.1 Event Names (PLAN_METRICS enum)

| Constant | Value | When | Emitter |
|---|---|---|---|
| `PLAN_START` | `"plan:metrics:start"` | Plan execution begins | `Plan.Process()` |
| `PLAN_END` | `"plan:metrics:end"` | Plan finishes (success, fail, stop, completed_with_errors) | `Plan.Process()` |
| `STEP_START` | `"plan:metrics:step:start"` | Step execution begins | `Step.WrapStepWithSignal` |
| `STEP_END` | `"plan:metrics:step:end"` | Step finishes (success or fail) | `Step.WrapStepWithSignal` |
| `STEP_INC` | `"plan:metrics:step:inc"` | Incremental row/step metrics update | `Step.OnErrorRow`, `Step.OnErrorStep`, error handlers |

There are **no row-level events** — per-row metrics are accumulated via `STEP_INC` with incremental counters (e.g. `{ passed: 1 }`, `{ skipped: 1 }`, `{ sunk: 1 }`, `{ failed: 1 }`).

### 2.2 Event data shape

All events carry `Partial<T_StepMetrics>` or `Partial<T_PlanMetrics>` as their `data` (or `detail`) payload. Handlers merge partial updates into the accumulated state.

**Implementors dispatch `CustomEvent` with either `data` or `detail` property** (both work with `@dimkl/events`).

---

## 3. Type Definitions

### 3.1 `T_StepMetrics` (replaces v1's nested structure)

```typescript
export type T_StepMetrics = {
    planName: string
    index: number
    rows?: {
        input?: number
        passed?: number
        skipped?: number
        sunk?: number
        failed?: number
    },
    step?: {
        startTime?: Date
        endTime?: Date
        durationMs?: number
        status?: STEP_STATUS
    },
    attemptCount?: number
}
```

All fields are optional — events emit partial data that `PlanMetrics` merges.

### 3.2 `T_StepRowsMetrics` (was `T_StepRowMetrics`)

```typescript
export type T_StepRowsMetrics = {
    input: number
    passed: number
    skipped: number
    sunk: number
    failed: number
}
```

Still exists as a shape but no longer used in return types. Referenced in `T_StepMetrics` inline type.

### 3.3 `T_StepResult` (no metrics field)

```typescript
export type T_StepResult = {
    data?: DataTable
    signal: STEP_SIGNAL
    outcome: STEP_OUTCOME
    $context: TContext
    error?: Error
}
```

`metrics` has been **removed entirely** (not just made optional).

### 3.4 `TRowResult` (eliminated)

The `TRowResult` type no longer exists. All functions that previously returned `TRowResult` now return:
- `TRow` — for row-level handlers (`_onErrorRowSkip`, `_onErrorRowSink`, `_onErrorRowRetry`)
- `DataTable` — for `OnErrorRow` (returning the mapped DataTable directly)
- `DataTable | undefined` — for `OnError`, `OnErrorStep`

### 3.5 `T_PlanMetrics` (defined in PlanMetrics.ts)

```typescript
export type T_PlanMetrics = {
    planName: string
    startTime: Date
    endTime?: Date
    durationMs?: number
    status: PLAN_STATUS
    steps: T_StepMetrics[]
}
```

### 3.6 `PLAN_STATUS` enum

```typescript
export enum PLAN_STATUS {
    STOPPED = "stopped",
    RUNNING = "running",
    SUCCESS = "success",
    FAILED = "failed",
    COMPLETED = "completed",
    COMPLETED_WITH_ERRORS = "completed_with_errors"
}
```

---

## 4. Event Type Declarations (global)

Declared in `PlanMetrics.ts` using `@dimkl/events` interface merging:

```typescript
declare global {
    interface PlanStart extends IEvent {
        type: PLAN_METRICS.PLAN_START       // "plan:metrics:start"
        data: Partial<T_PlanMetrics>
    }
    interface PlanEnd extends IEvent {
        type: PLAN_METRICS.PLAN_END         // "plan:metrics:end"
        data: Partial<T_PlanMetrics>
    }
    interface StepStart extends IEvent {
        type: PLAN_METRICS.STEP_START       // "plan:metrics:step:start"
        data?: Partial<T_StepMetrics>
    }
    interface StepEnd extends IEvent {
        type: PLAN_METRICS.STEP_END         // "plan:metrics:step:end"
        data?: Partial<T_StepMetrics>
    }
    interface StepInc extends IEvent {
        type: PLAN_METRICS.STEP_INC         // "plan:metrics:step:inc"
        data?: Partial<T_StepMetrics>
    }

    interface Events {
        [PLAN_METRICS.PLAN_START]: PlanStart
        [PLAN_METRICS.PLAN_END]: PlanEnd
        [PLAN_METRICS.STEP_START]: StepStart
        [PLAN_METRICS.STEP_END]: StepEnd
        [PLAN_METRICS.STEP_INC]: StepInc
    }
}
```

---

## 5. PlanMetrics Class — Central Accumulator

```typescript
export class PlanMetrics {
    static Bus = new EventBus()
    static Metrics: Map<string, T_PlanMetrics | undefined> = new Map()

    @on({ eventName: PLAN_METRICS.STEP_START, eventBus: PlanMetrics.Bus })
    static _handlePlanStepStart(event: CustomEvent<Partial<T_StepMetrics>>) {
        // Merges event.data into planMetrics.steps[stepIndex]
    }

    @on({ eventName: PLAN_METRICS.STEP_END, eventBus: PlanMetrics.Bus })
    static _handlePlanStepEnd(event: CustomEvent<Partial<T_StepMetrics>>) {
        // Computes durationMs = endTime - startTime, then merges
    }

    @on({ eventName: PLAN_METRICS.STEP_INC, eventBus: PlanMetrics.Bus })
    static _handlePlanStepInc(event: CustomEvent<Partial<T_StepMetrics>>) {
        // Accumulates row counters (passed/skipped/sunk/failed) via addition
        for (const key in metrics.rows) {
            JsonUtils.Set(stepMetrics, `rows.${key}`,
                JsonUtils.Get(stepMetrics, `rows.${key}`, 0) +
                JsonUtils.Get(metrics, `rows.${key}`, 0))
        }
    }

    @on({ eventName: PLAN_METRICS.PLAN_START, eventBus: PlanMetrics.Bus })
    static _handlePlanStart(event: CustomEvent<Partial<T_PlanMetrics>>) {
        // Merges event.data into planMetrics
    }

    @on({ eventName: PLAN_METRICS.PLAN_END, eventBus: PlanMetrics.Bus })
    static _handlePlanEnd(event: CustomEvent<Partial<T_PlanMetrics>>) {
        // Computes durationMs = endTime - startTime, then merges
    }
}
```

---

## 6. Integration Points

### 6.1 `Plan.Process()` — Plan-level events

- Dispatches `PLAN_METRICS.PLAN_START` before the step loop
- Dispatches `PLAN_METRICS.PLAN_END` after completion (success/stop/error)
- Status values: `PLAN_STATUS.RUNNING` → `PLAN_STATUS.COMPLETED` | `PLAN_STATUS.COMPLETED_WITH_ERRORS` | `PLAN_STATUS.FAILED`

### 6.2 `Step.WrapStepWithSignal` — Step-level events

- Dispatches `PLAN_METRICS.STEP_START` with `{ planName, index, step: { startTime }, attemptCount: 1, rows: { input } }` before execution
- On success: dispatches `PLAN_METRICS.STEP_END` with `{ planName, index, step: { endTime, status: STEP_STATUS.SUCCESS } }`
- On failure: dispatches `PLAN_METRICS.STEP_END` with `{ planName, index, step: { endTime, status: STEP_STATUS.FAILED } }`
- `T_StepResult` no longer carries `metrics`

### 6.3 `Step.OnErrorRow` — Row-level increments (no TRowResult)

- `RowsMap` callback returns `TRow` (no `TRowResult` wrapper)
- On success: dispatches `PLAN_METRICS.STEP_INC` with `{ rows: { passed: 1 } }`, returns `row`
- On error: delegates to `_onErrorRowSkip` / `_onErrorRowSink` / `_onErrorRowRetry`
- `OnErrorRow` return type: `Promise<DataTable>` (the mapped DataTable)

### 6.4 Error handler return types

| Function | Old return | New return |
|---|---|---|
| `OnError` | `Promise<DataTable \| undefined>` | same (no TRowResult unwrapping needed) |
| `OnErrorRow` | `Promise<TRowResult \| undefined>` | `Promise<DataTable>` |
| `_onErrorRowSkip` | `Promise<TRowResult>` | `Promise<TRow>` |
| `_onErrorRowSink` | `Promise<TRowResult>` | `Promise<TRow>` |
| `_onErrorRowRetry` | `Promise<TRowResult>` | `Promise<TRow>` |
| `OnErrorStep` | `Promise<DataTable \| undefined>` | same |

All error handlers also dispatch `PLAN_METRICS.STEP_INC` with appropriate row counters (`{ skipped: 1 }`, `{ sunk: 1 }`, `{ failed: count }`).

### 6.5 `T_StepOnErrorArgs` — `rowMetrics` removed

The `rowMetrics` parameter has been removed from `T_StepOnErrorArgs` since metrics are no longer accumulated inline — they're emitted as events.

---

## 7. Plan Metrics Access

```typescript
// Plan.ts
get Metrics(): T_PlanMetrics | undefined {
    return PlanMetrics.Metrics.get(this.Name)
}
```

The `PlanMetrics.Metrics` Map is populated by the `@on` event handlers. The `Plan.Metrics` getter provides backward-compatible access for external consumers (e.g. the `/:plan/metrics` endpoint via `PlansManager.GetPlanMetrics`).

---

## 8. File Map

```
src/modules/plan/
  metrics/
    PlanMetrics.ts          # Event declarations, PlanMetrics class, event handlers
  Step.ts                   # Event dispatches, TRowResult eliminated
  Plan.ts                   # Plan-level event dispatches, Metrics getter
  @consts.ts                # PLAN_STATUS enum extended
  types/
    T_StepResult.ts         # T_StepResult.metrics removed, T_StepMetrics simplified
```

---

## 9. Key Differences from v1

| Aspect | v1 | v2 |
|---|---|---|
| `TRowResult` type | Exists with `data` + `metrics` | **Eliminated** |
| `T_StepResult.metrics` | Required field | **Removed** entirely |
| Metrics accumulation | Inline in `WrapStepWithSignal` + `rowMetrics` accumulator | Events dispatched, `PlanMetrics` merges |
| Row-level metrics | `TRowResult.metrics` passed through chain | `STEP_INC` events with incremental counters |
| `T_StepOnErrorArgs` | Includes `rowMetrics` | `rowMetrics` removed |
| `OnErrorRow` return | `Promise<TRowResult \| undefined>` | `Promise<DataTable>` |
| Error handler returns | `Promise<TRowResult>` | `Promise<TRow>` |
| `T_StepMetrics` | Required nested `rows`, `step`, `attemptCount` | All optional, includes `planName`, `index` |
| Plan status | Only `SUCCESS` / `FAILED` | Adds `COMPLETED`, `COMPLETED_WITH_ERRORS` |
| Metrics storage | `Plan._metrics` private property | `PlanMetrics.Metrics` static Map |
