# `/:plan/metrics` — Plan Metrics Endpoint

## Purpose
Expose the metrics collected during the last execution of a plan. The metrics are already stored on the `Plan` instance via the `_metrics` property after `Process()` completes.

## Route
`POST /:plan/metrics`

- Already defined in `PlanRouter.ts` with `.all(UserResponse.IsAuthenticated)`
- Currently returns `ResponseHandler.ResponseNotImplemented`
- Method stays **POST** (consistent with the existing `/:plan/reload` pattern in this codebase)

## Flow

### 1. PlanResponse layer (`src/modules/core/response/PlanResponse.ts`)
- New static method `PlanResponse.GetPlanMetrics(req, res): void`
- Extract `plan` from `req.params`
- Validate `plan` is defined (`Assert.Var<string>`)
- Call `PlansManager.GetPlanMetrics(plan)` — a new method on `PlansManager`
- Convert the internal response to Express response using `Convert.InternalResponseToResponse`

### 2. PlansManager layer (`src/modules/plan/PlansManager.ts`)
- New static method `GetPlanMetrics(planName: string): TInternalResponse<T_PlanMetrics | TJson>`
- Retrieve `Plan` instance from the `Plans` map by `planName`
- If plan not found → return 404 (`HttpErrorNotFound`)
- Access `plan.Metrics` getter
- If `plan.Metrics` is `undefined` → return 404 with message `"No metrics available for plan '{planName}' (plan may not have been executed yet)"`
- Otherwise, prepare the response object with live computation:
  - If `endTime` is `undefined` (plan is still running), compute `durationMs` as `Date.now() - startTime.getTime()` instead of using the stored value
  - If `endTime` is set, use the stored `durationMs` as-is
  - Omit `endTime` from the response when it is `undefined` (it will be excluded by JSON serialization)
- Return `HttpResponse.Ok(computedMetrics)`

### 3. Response shape

Success — plan completed (200):
```json
{
  "startTime": "2025-01-01T00:00:00.000Z",
  "endTime": "2025-01-01T00:00:01.500Z",
  "durationMs": 1500,
  "status": "success",
  "steps": [
    {
      "index": 0,
      "command": "select",
      "status": "completed",
      "outcome": "success",
      "durationMs": 200,
      "metrics": {
        "rows": {
          "input": 100,
          "passed": 80,
          "skipped": 10,
          "sunk": 5,
          "failed": 5
        },
        "step": {
          "startTime": "2025-01-01T00:00:00.000Z",
          "endTime": "2025-01-01T00:00:00.200Z",
          "durationMs": 200,
          "status": "completed"
        },
        "attemptCount": 1
      }
    }
  ]
}
```

Success — plan currently processing (200):
```json
{
  "startTime": "2025-01-01T00:00:00.000Z",
  "durationMs": 4732,
  "status": "success",
  "steps": [
    {
      "index": 0,
      "command": "select",
      "status": "completed",
      "outcome": "success",
      "durationMs": 200,
      "metrics": {
        "rows": {
          "input": 100,
          "passed": 80,
          "skipped": 10,
          "sunk": 5,
          "failed": 5
        },
        "step": {
          "startTime": "2025-01-01T00:00:00.000Z",
          "endTime": "2025-01-01T00:00:00.200Z",
          "durationMs": 200,
          "status": "completed"
        },
        "attemptCount": 1
      }
    },
    {
      "index": 1,
      "command": "update",
      "status": "running",
      "durationMs": null
    }
  ]
}
```

Note: `endTime` is absent when the plan is still processing. `durationMs` is computed live from `startTime` to the moment of the API call. In-progress steps have `null` duration and no `metrics` or `outcome`.

Error — plan not found (404):
```json
{
  "error": "Plan 'myPlan' not found"
}
```

Error — no metrics yet (404):
```json
{
  "error": "No metrics available for plan 'myPlan'"
}
```

### 4. Authentication
- Already protected by `UserResponse.IsAuthenticated` middleware on the route
- No additional permission check required (read-only metrics, any authenticated user can view)

## Files to modify
1. `src/modules/plan/PlansManager.ts` — add `static GetPlanMetrics(planName: string)` method
2. `src/modules/core/response/PlanResponse.ts` — add `static GetPlanMetrics(req, res)` method
3. `src/modules/core/routes/PlanRouter.ts` — replace `ResponseHandler.ResponseNotImplemented` with `PlanResponse.GetPlanMetrics`

## Non-goals
- No changes to `T_PlanMetrics`, `T_PlanStepEntry`, or `T_StepMetrics` types (they are already sufficient)
- No changes to `Plan.ts` Process method (metrics collection is already in place)
- No database changes
- No new types or interfaces
