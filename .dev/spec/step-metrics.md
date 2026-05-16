# Step Metrics Specification (Core v1)

## Overview

This specification defines the core execution metrics for a Metal ETL step.

The goal is to keep the metric model minimal while still matching the essential signals commonly expected in established ETL and workflow systems: row counts, execution timing, step status, and retry attempts.

This version defines metrics only. It does not define storage, collection strategy, aggregation, or dashboard behavior.

## Metrics Definition

### Row Metrics

- **input**: Rows received by the step for processing.
- **passed**: Rows successfully processed by the step and emitted on the main output.
- **skipped**: Rows intentionally ignored by business logic or policy.
- **sunk**: Rows redirected to a sink, reject flow, dead-letter path, or quarantine output instead of the main successful output.
- **failed**: Rows that ended in technical or processing failure.

### Time Metrics

- **stepStartTime**: Timestamp when step execution begins.
- **stepEndTime**: Timestamp when step execution ends.
- **stepDurationMs**: Total execution time of the step in milliseconds.

### Status Metric

- **stepStatus**: Final execution status of the step.

Recommended values:
- `not_started`
- `running`
- `success`
- `failed`
- `skipped`

### Retry Metric

- **attemptCount**: Total number of execution attempts made for the step, including the first attempt.

Examples:
- `attemptCount = 1` means the step ran once with no retry.
- `attemptCount = 2` means the step was retried once.
- `attemptCount = 3` means the step was retried twice.

This metric aligns with the `attempts` parameter in Metal's retry configuration, where `attempts` represents the maximum number of attempts including the initial execution.

## Metric Semantics

### input

`input` represents the number of rows received by the step for processing.

It should be treated as an input metric, not an output metric.

### passed

`passed` represents rows successfully processed by the step and emitted on the main output.

### skipped

`skipped` represents rows that were intentionally not processed further because the step logic or runtime policy decided to skip them.

These rows are not technical failures.

### sunk

`sunk` represents rows that were diverted away from the main output into a sink mechanism such as reject storage, dead-letter handling, or quarantine flow.

These rows are handled, but are not considered successful main-path results.

### failed

`failed` represents rows that could not be processed because of an actual error.

These rows ended in failure rather than deliberate skip or sink behavior.

### stepStartTime

`stepStartTime` records when the step starts executing.

### stepEndTime

`stepEndTime` records when the step finishes executing, regardless of whether the final result is success, failure, or skip.

### stepDurationMs

`stepDurationMs` is derived from `stepEndTime - stepStartTime` and should be stored explicitly because duration is one of the most commonly queried operational metrics.

### stepStatus

`stepStatus` represents the final operational outcome of the step.

It applies to the step as a whole, not to individual rows.

A step may have:
- `stepStatus = success` with non-zero `skipped` or `sunk`
- `stepStatus = failed` even if some rows were processed before the failure

### attemptCount

`attemptCount` represents the total number of times the step execution was attempted, including the initial run.

This metric applies to both step-level and row-level retry scenarios:

- For step-level retries: Increases when the whole step is retried
- For row-level retries: Increases when individual rows are retried within the step

The metric tracks the total retry attempts regardless of whether the retry scope is configured at the step or row level.

## Implementation Notes

### TypeScript Type Definitions

The metrics should be implemented as optional fields in the step result type:

```typescript
export type T_StepMetrics = {
    rows: {
		input?: number
        passed?: number
        skipped?: number
        sunk?: number
		failed?: number
	},
    step: {
		startTime?: Date
		endTime?: Date
		durationMs?: number
		status?: string
	},
    attemptCount?: number
}

export type T_StepResult = {
    data?: DataTable
    signal: STEP_SIGNAL
    outcome: STEP_OUTCOME
    $context: TContext
    error?: Error
    metrics?: T_StepMetrics
}
```

### Integration Approach

- **Step functions** continue to return `Promise<DataTable>` (no change needed)
- **`Step.WrapStepWithSignal`** wrapper should be enhanced to include metrics in the `T_StepResult`
- Metrics are metadata separate from the actual data transformation output
- This maintains backward compatibility for existing data processing logic
- Metrics should be populated during step execution within the wrapper and attached to the result

### Wrapper Enhancement

The `WrapStepWithSignal` method should be modified to:
1. Track timing metrics (`stepStartTime`, `stepEndTime`, `stepDurationMs`)
2. Count row metrics during execution
3. Track retry attempts from the error handling system
4. Determine final step status
5. Attach metrics to the `T_StepResult` before returning

## Notes

- `skipped`, `sunk`, and `failed` should be distinct and non-overlapping categories.
- `input` should have stable semantics across all step types.
- `attemptCount` should always be at least `1` once execution has started.