# Step Metrics Specification v2 — Event-Driven Metrics

## Status: Draft

## Overview

Metrics are currently **hardcoded** into `T_StepResult`, `TRowResult`, and `T_StepRowMetrics`, computed inline inside `Step.WrapStepWithSignal` and threaded through error handlers (`OnErrorRow` returning `TRowResult` with `metrics: Partial<T_StepRowMetrics>`). Every consumer that needs metrics must read them from the result object.

This spec proposes an **event-driven** alternative using `@dimkl/events`: instead of baking metrics into return types, emit **typed events** at key lifecycle points. Any consumer (logging, storage, dashboard, webhook) subscribes independently.

> The **metric semantics** (what each field means) are unchanged from v1 spec. This spec focuses on _how_ metrics are produced and consumed.

---

## 1. Why Events?

| Concern               | Current (v1)                                     | Proposed (v2)                                        |
| --------------------- | ------------------------------------------------ | ---------------------------------------------------- |
| Coupling              | `T_StepResult.metrics` required everywhere       | Metrics are opt-in events                            |
| Extensibility         | Add fields → change type + all consumers         | Add fields → new event type, existing code untouched |
| Testability           | Mock entire `WrapStepWithSignal`                 | Subscribe, assert events arrived                     |
| Cross-cutting         | Must touch Plan.ts, Step.ts, types               | Single subscriber attaches at startup                |
| Row-level propagation | `TRowResult.metrics` passed through `OnErrorRow` | Row events emitted at each stage                     |
| Real-time visibility  | None until step completes                        | `step:row:*` events stream as they happen            |

---

## 2. `@dimkl/events` Primer

The library provides three primitives:

- **`@dispatch({ eventName?, eventBus? })`** — Decorator on a method; emits an event after the method returns (or resolves). Payload is the return value.
- **`@on({ eventName, eventBus? })`** — Decorator on a static/instance method; receives dispatched events.
- **`EventBus`** — Isolated event namespace. If omitted, events go to the global bus.

Event types are injected via global interface merging:

```typescript
declare global {
  interface StepMetricsStartEvent extends IEvent {
    type: "step:metrics:start";
    data: T_StepMetricsStartPayload;
  }
  interface Events {
    "step:metrics:start": StepMetricsStartEvent;
  }
}
```

---

## 3. Event Schema

### 3.1 Step-Level Events

| Event                      | When                         | Data                                                                                  |
| -------------------------- | ---------------------------- | ------------------------------------------------------------------------------------- |
| `step:metrics:start`       | Step execution begins        | `{ planName, stepIndex, stepCommand, startTime, inputRowCount }`                      |
| `step:metrics:row:passed`  | A row passes                 | `{ planName, stepIndex, rowIdx }`                                                     |
| `step:metrics:row:skipped` | A row is skipped             | `{ planName, stepIndex, rowIdx, reason? }`                                            |
| `step:metrics:row:sunk`    | A row is sunk                | `{ planName, stepIndex, rowIdx, targetSchema, targetEntity }`                         |
| `step:metrics:row:failed`  | A row fails                  | `{ planName, stepIndex, rowIdx, error? }`                                             |
| `step:metrics:retry`       | A retry occurs (step or row) | `{ planName, stepIndex, attempt, scope: "step"\|"row", error? }`                      |
| `step:metrics:complete`    | Step finishes (success)      | `{ planName, stepIndex, endTime, durationMs, status, rows }` full `T_StepMetricsRows` |
| `step:metrics:fail`        | Step fails                   | `{ planName, stepIndex, endTime, durationMs, status, error }`                         |

### 3.2 Plan-Level Events

| Event                   | When                  | Data                                                        |
| ----------------------- | --------------------- | ----------------------------------------------------------- |
| `plan:metrics:start`    | Plan execution begins | `{ planName, startTime, totalSteps }`                       |
| `plan:metrics:complete` | Plan finishes         | `{ planName, endTime, durationMs, status, stepsSummary[] }` |

---

## 4. Type Definitions

### 4.1 Event Payload Types (stay as schemas)

```typescript
// Reused from v1 as event payload shapes — not tied to step results
export type T_StepRowMetrics = {
  input: number;
  passed: number;
  skipped: number;
  sunk: number;
  failed: number;
};

export type T_StepMetrics = {
  rows: T_StepRowMetrics;
  step: {
    startTime?: Date;
    endTime?: Date;
    durationMs?: number;
    status?: STEP_STATUS;
  };
  attemptCount: number;
};

export type T_PlanMetrics = {
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  status: "success" | "failed" | "completed_with_errors";
  steps: T_PlanStepEntry[];
};
```

### 4.2 Event Type Declarations

Declared globally using `@dimkl/events` interface merging:

```typescript
import type { IEvent } from "@dimkl/events";

declare global {
  // ── Step events ──
  interface StepMetricsStartPayload {
    planName: string;
    stepIndex: number;
    stepCommand: string;
    startTime: Date;
    inputRowCount: number;
  }
  interface StepMetricsStartEvent extends IEvent {
    type: "step:metrics:start";
    data: StepMetricsStartPayload;
  }

  interface StepMetricsRowPayload {
    planName: string;
    stepIndex: number;
    rowIdx?: string;
  }
  interface StepMetricsRowPassedEvent extends IEvent {
    type: "step:metrics:row:passed";
    data: StepMetricsRowPayload;
  }
  interface StepMetricsRowSkippedEvent extends IEvent {
    type: "step:metrics:row:skipped";
    data: StepMetricsRowPayload & { reason?: string };
  }
  interface StepMetricsRowSunkEvent extends IEvent {
    type: "step:metrics:row:sunk";
    data: StepMetricsRowPayload & {
      targetSchema?: string;
      targetEntity?: string;
    };
  }
  interface StepMetricsRowFailedEvent extends IEvent {
    type: "step:metrics:row:failed";
    data: StepMetricsRowPayload & { error?: string };
  }

  interface StepMetricsRetryPayload {
    planName: string;
    stepIndex: number;
    attempt: number;
    scope: "step" | "row";
    error?: string;
  }
  interface StepMetricsRetryEvent extends IEvent {
    type: "step:metrics:retry";
    data: StepMetricsRetryPayload;
  }

  interface StepMetricsCompletePayload {
    planName: string;
    stepIndex: number;
    endTime: Date;
    durationMs: number;
    status: STEP_STATUS;
    rows: T_StepRowMetrics;
    attemptCount: number;
  }
  interface StepMetricsCompleteEvent extends IEvent {
    type: "step:metrics:complete";
    data: StepMetricsCompletePayload;
  }

  interface StepMetricsFailPayload {
    planName: string;
    stepIndex: number;
    endTime: Date;
    durationMs: number;
    status: STEP_STATUS;
    error: string;
    rows: Partial<T_StepRowMetrics>;
    attemptCount: number;
  }
  interface StepMetricsFailEvent extends IEvent {
    type: "step:metrics:fail";
    data: StepMetricsFailPayload;
  }

  // ── Plan events ──
  interface PlanMetricsStartPayload {
    planName: string;
    startTime: Date;
    totalSteps: number;
  }
  interface PlanMetricsStartEvent extends IEvent {
    type: "plan:metrics:start";
    data: PlanMetricsStartPayload;
  }

  interface PlanMetricsCompletePayload {
    planName: string;
    endTime: Date;
    durationMs: number;
    status: "success" | "failed" | "completed_with_errors";
    steps: T_PlanStepEntry[];
  }
  interface PlanMetricsCompleteEvent extends IEvent {
    type: "plan:metrics:complete";
    data: PlanMetricsCompletePayload;
  }

  // ── Merge into Events map ──
  interface Events {
    "step:metrics:start": StepMetricsStartEvent;
    "step:metrics:row:passed": StepMetricsRowPassedEvent;
    "step:metrics:row:skipped": StepMetricsRowSkippedEvent;
    "step:metrics:row:sunk": StepMetricsRowSunkEvent;
    "step:metrics:row:failed": StepMetricsRowFailedEvent;
    "step:metrics:retry": StepMetricsRetryEvent;
    "step:metrics:complete": StepMetricsCompleteEvent;
    "step:metrics:fail": StepMetricsFailEvent;
    "plan:metrics:start": PlanMetricsStartEvent;
    "plan:metrics:complete": PlanMetricsCompleteEvent;
  }
}
```

---

## 5. Integration into the Codebase

### 5.1 Step Class — `@dispatch` on key methods

Existing `Step` class methods get decorated to emit events:

```typescript
import { dispatch } from "@dimkl/events";

export class Step {
  static WrapStepWithSignal(
    fnStep: T_StepFunction,
    fnRow?: T_RowFunction,
    signal: STEP_SIGNAL = STEP_SIGNAL.NEXT,
  ): T_StepFunctionWithSignal {
    return async (stepParams, $context): Promise<T_StepResult> => {
      const stepStartTime = new Date();
      // ... existing init code ...

      // Emit start — event is dispatched automatically after
      // a @dispatch-decorated method returns
      this._emitStepStart({
        planName,
        stepIndex,
        stepCommand,
        stepStartTime,
        inputRowCount,
      });

      // ... existing execution logic, with row-level events emitted inline
      // via eventBus.emit() for fine-grained row events ...

      // On success:
      this._emitStepComplete({ ...metrics, rows, status: STEP_STATUS.SUCCESS });

      // On failure:
      this._emitStepFail({ ...partialMetrics, error: error.message });
    };
  }

  // Internal methods decorated to emit events
  @dispatch({ eventName: "step:metrics:start" })
  static _emitStepStart(
    payload: StepMetricsStartPayload,
  ): StepMetricsStartPayload {
    return payload; // return value becomes event.data
  }

  @dispatch({ eventName: "step:metrics:row:passed" })
  static _emitRowPassed(payload: StepMetricsRowPayload): StepMetricsRowPayload {
    return payload;
  }

  @dispatch({ eventName: "step:metrics:row:skipped" })
  static _emitRowSkipped(
    payload: StepMetricsRowPayload & { reason?: string },
  ): typeof payload {
    return payload;
  }

  @dispatch({ eventName: "step:metrics:row:sunk" })
  static _emitRowSunk(
    payload: StepMetricsRowPayload & {
      targetSchema?: string;
      targetEntity?: string;
    },
  ): typeof payload {
    return payload;
  }

  @dispatch({ eventName: "step:metrics:row:failed" })
  static _emitRowFailed(
    payload: StepMetricsRowPayload & { error?: string },
  ): typeof payload {
    return payload;
  }

  @dispatch({ eventName: "step:metrics:retry" })
  static _emitRetry(payload: StepMetricsRetryPayload): StepMetricsRetryPayload {
    return payload;
  }

  @dispatch({ eventName: "step:metrics:complete" })
  static _emitStepComplete(
    payload: StepMetricsCompletePayload,
  ): StepMetricsCompletePayload {
    return payload;
  }

  @dispatch({ eventName: "step:metrics:fail" })
  static _emitStepFail(
    payload: StepMetricsFailPayload,
  ): StepMetricsFailPayload {
    return payload;
  }
}
```

> **Why static methods and not inline `dispatch` on `WrapStepWithSignal`?**  
> `@dispatch` fires _after_ the decorated method returns. `WrapStepWithSignal` is a higher-order function that returns a closure, not a single invocation. The pattern above gives us explicit control over when each event fires.

### 5.2 Plan Class — Plan-level events

```typescript
import { dispatch } from "@dimkl/events";

export class Plan {
  @dispatch({ eventName: "plan:metrics:start" })
  static _emitPlanStart(
    payload: PlanMetricsStartPayload,
  ): PlanMetricsStartPayload {
    return payload;
  }

  @dispatch({ eventName: "plan:metrics:complete" })
  static _emitPlanComplete(
    payload: PlanMetricsCompletePayload,
  ): PlanMetricsCompletePayload {
    return payload;
  }
}
```

### 5.3 Row-level events (fine-grained)

For row-level processing, the `RowsMap` callback in `OnErrorRow` emits an event per row:

```typescript
// Inside WrapStepWithSignal (row loop):
const data = await $context.$plan?.data.RowsMap(async (row: Partial<TRow>) => {
  return fnRow(row, stepParams, $context)
    .then((row) => {
      Step._emitRowPassed({ planName, stepIndex, rowIdx: row.__idx__ });
      return { data: row, metrics: { passed: 1 } } as TRowResult;
    })
    .catch((caughtError) => {
      // error handler calls _emitRowSkipped / _emitRowSunk / _emitRowFailed
    });
});
```

> **Performance note:** For large datasets, row-level events can be batched. See §8.

### 5.4 TRowResult and T_StepResult changes

```typescript
// v2: metrics become optional since consumers can use events
export type T_StepResult = {
  data?: DataTable;
  signal: STEP_SIGNAL;
  outcome: STEP_OUTCOME;
  $context: TContext;
  error?: Error;
  metrics?: T_StepMetrics; // was required; now optional
};

export type TRowResult = {
  data: TRow;
  metrics?: Partial<T_StepRowMetrics>; // was required; now optional
};
```

Existing consumers that read `result.metrics` still work — it's populated as before. New consumers can subscribe to events instead, or to supplement.

---

## 6. Consumer Examples

### 6.1 Metrics Storage Subscriber

```typescript
import { on } from "@dimkl/events";

class MetricsStore {
  private db: MetricsDatabase;

  @on({ eventName: "step:metrics:complete" })
  async handleStepComplete(event: CustomEvent<StepMetricsCompletePayload>) {
    const { planName, stepIndex, rows, durationMs, status } = event.data;
    await this.db.insert("step_metrics", {
      planName,
      stepIndex,
      rows,
      durationMs,
      status,
      timestamp: new Date(),
    });
  }

  @on({ eventName: "plan:metrics:complete" })
  async handlePlanComplete(event: CustomEvent<PlanMetricsCompletePayload>) {
    const { planName, durationMs, status, steps } = event.data;
    await this.db.insert("plan_metrics", {
      planName,
      durationMs,
      status,
      stepCount: steps.length,
      timestamp: new Date(),
    });
  }
}
```

### 6.2 Real-time Logger

```typescript
import { on } from "@dimkl/events";

class MetricsLogger {
  @on({ eventName: "step:metrics:row:failed" })
  static logRowFailed(
    event: CustomEvent<StepMetricsRowPayload & { error?: string }>,
  ) {
    Logger.Warn(
      `Row ${event.data.rowIdx} failed in step ${event.data.stepIndex}: ${event.data.error}`,
    );
  }

  @on({ eventName: "step:metrics:retry" })
  static logRetry(event: CustomEvent<StepMetricsRetryPayload>) {
    Logger.Warn(
      `Step ${event.data.stepIndex} retry #${event.data.attempt} (${event.data.scope})`,
    );
  }
}
```

### 6.3 Plan-level metrics aggregation (backward compat)

The existing `.Metrics` getter can be populated by subscribing internally:

```typescript
// Inside Plan.ts constructor or init:
import { on } from "@dimkl/events";

export class Plan {
  private _metrics?: T_PlanMetrics;

  @on({ eventName: "step:metrics:complete" })
  _onStepComplete(event: CustomEvent<StepMetricsCompletePayload>) {
    this._accumulateStepMetrics(event.data);
  }

  @on({ eventName: "plan:metrics:complete" })
  _onPlanComplete(event: CustomEvent<PlanMetricsCompletePayload>) {
    this._metrics = event.data;
  }
}
```

---

## 7. Backward Compatibility & Migration

| Concern                              | Approach                                                      |
| ------------------------------------ | ------------------------------------------------------------- |
| Existing `T_StepResult.metrics`      | Still populated (optional). Remove `?` later after migration. |
| Existing `TRowResult.metrics`        | Still populated but now optional; no breakage.                |
| Unit tests checking `result.metrics` | Continue to pass unchanged.                                   |
| Tests checking event emission        | Add new tests alongside; old tests untouched.                 |
| Step functions returning `DataTable` | Unchanged. Events don't affect return types.                  |

### Migration path

1. **Phase 1 — Install `@dimkl/events`, add event types, add dispatch methods**
   - Add `@dimkl/events` as dependency
   - Declare global event interfaces (types-only)
   - Add `_emit*` static methods to `Step` and `Plan`
   - Keep existing metrics code intact

2. **Phase 2 — Add event emission calls alongside existing code**
   - Call `_emitStepStart`, `_emitStepComplete`, `_emitStepFail` in `WrapStepWithSignal`
   - Call `_emitRowPassed/_emitRowSkipped/_emitRowSunk/_emitRowFailed` in `OnErrorRow`
   - Call `_emitRetry` in retry handlers
   - Call `_emitPlanStart/_emitPlanComplete` in `Plan.Process()`
   - Existing metrics continue to work; events are additive

3. **Phase 3 — Make metrics optional in types**
   - Change `metrics: T_StepMetrics` → `metrics?: T_StepMetrics` in `T_StepResult`
   - Change `metrics: Partial<T_StepRowMetrics>` → `metrics?: Partial<T_StepRowMetrics>` in `TRowResult`
   - Update any code that assumed metrics was always present
   - No functional change; prepares for full decoupling

4. **Phase 4 (optional) — Build event consumers**
   - `MetricsStore` subscriber (database persistence)
   - Real-time monitoring via WebSocket-forwarded events
   - Webhook integration
   - Metrics dashboard

---

## 8. Performance Considerations

| Concern                             | Mitigation                                                                                                                                                       |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Row-level events (millions of rows) | Batch events: emit every N rows or after a time window. Add `_emitRowBatch(passed: number, skipped: number, ...)` with a `@dispatch` that fires less frequently. |
| Decorator overhead                  | `@dimkl/events` is zero-dependency, lightweight. Decorator resolution happens once at class load.                                                                |
| Event bus contention                | Use **isolated `EventBus`** per plan execution for multi-tenant isolation.                                                                                       |
| Memory — unsubscribed listeners     | Use `EventBus` with bounded lifetime (scope per plan run). Destroy bus when plan completes.                                                                      |

### Option: Isolated EventBus per plan run

```typescript
import { EventBus } from "@dimkl/events";

export class Plan {
  private eventBus = new EventBus();

  async Process(): Promise<void> {
    // Pass eventBus to Step dispatch calls
    Step._emitStepStart.withBus(this.eventBus)(payload);
    // ...
  }
}
```

This prevents cross-plan event leakage and allows clean cleanup.

---

## 9. File Map

```
src/modules/plan/
  events/
    StepMetricsEvents.ts        # Global interface declarations (types only)
    PlanMetricsEvents.ts
  steps/                        # Unchanged — step functions return DataTable
  Step.ts                       # Add @dispatch _emit* methods + emission calls
  Plan.ts                       # Add @dispatch _emitPlan* + event bus (optional)
  consumers/
    MetricsStore.ts             # Example subscriber (database persistence)
    MetricsLogger.ts            # Example subscriber (real-time logging)
```

---

## 10. Open Questions

1. **Should row-level events be on by default or opt-in?**  
   For large datasets, row-per-event may be too noisy. Proposal: row events opt-in via plan config or a global toggle.
2. **Should we keep `metrics` in `T_StepResult` indefinitely or remove in v3?**  
   Keep for backward compat; deprecate in v3.
3. **Should `WrapStepWithSignal` remain the single metrics source or split into a `MetricsCollector` class?**  
   Split makes sense once Phase 2 proves event pattern. A `MetricsCollector` could manage accumulated state and emit events, reducing `Step.ts` complexity.
4. **Isolated EventBus per plan or global bus?**  
   Per-plan bus is safer for multi-tenant, but adds wiring complexity. Default to global bus; document path to isolation.
