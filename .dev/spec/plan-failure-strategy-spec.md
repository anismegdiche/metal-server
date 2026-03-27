# Plan Failure Strategy Specification

## Overview

This document defines how the Plan system handles failures with configurable failure behavior. It provides both traditional ETL and fault-tolerant options.

## Plan Configuration

### Failure Behavior

Plans can configure how they handle failures at the plan level:

```yaml
plans:
  my-plan:
    failure-strategy: return-data  # Default (current Metal behavior)
    # or
    failure-strategy: return-errors   # Stop on error, return only error info
```

### Failure Strategy Options

| Option          | Behavior                                            | Use Case                                                         |
| --------------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| `return-data`   | Continue execution on errors, return processed data | Data exploration, ML pipelines, fault-tolerant processing        |
| `return-errors` | Stop on first error, return only error information  | Critical data pipelines, financial transactions, traditional ETL |

## Implementation

### Plan Processing Loop

The Plan class uses a `while` loop to execute steps sequentially:

```typescript
let stepIndex = 0;
while (stepIndex < steps.length) {
  const _step = steps[stepIndex];
  // Execute step
  const _stepOutput = await _stepFunction(_stepParams, $context);
  // Handle result
  if (_stepOutput.signal === "stop") break;

  // Check failure strategy
  if (
    this.failureStrategy === "return-errors" &&
    _stepOutput.outcome === "failed"
  ) {
    break; // Stop execution on first error
  }

  stepIndex++;
}
```

### Step Output Structure

Steps return a `T_StepResult`:

```typescript
interface T_StepResult {
  data?: DataTable;
  signal: "next" | "stop";
  outcome: "success" | "failed";
  $context: TContext;
}
```

### Error Handling

#### Step Level Error Handling

The `Step.WrapStepWithSignal` method wraps step functions to catch errors:

```typescript
try {
  const data = await stepFunction(stepParams, $context);
  return { data, signal, outcome: "success", $context };
} catch (error) {
  return { data: undefined, signal, outcome: "failed", $context };
}
```

#### Plan Level Error Handling

The `Plan.Process` method handles errors based on failure strategy:

```typescript
try {
  // Execute steps
} catch (e: unknown) {
  Logger.Error(
    `'${this.Name}': stopped at step ${stepIndex} because of error: ${e.message}`,
  );

  if (this.failureStrategy === "return-errors") {
    return { errors: [{ step: stepIndex, error: e.message }] };
  }
}

// Return based on failure strategy
if (this.failureStrategy === "return-errors" && hasErrors) {
  return { errors: errorDetails };
} else {
  return this._data; // Always return DataTable for return-data
}
```

## Behavior Comparison

### When Step Throws Exception

1. **Step.WrapStepWithSignal** catches the exception
2. Returns `{ data: undefined, signal: 'next', outcome: 'failed' }`
3. **Plan behavior depends on failure-strategy**:
   - `return-data`: Continue to next step with failed outcome
   - `return-errors`: Stop execution immediately

### When Step Returns Failed Outcome

```typescript
return {
  data: undefined,
  signal: "next",
  outcome: "failed",
  $context,
};
```

- `return-data`: Plan continues execution
- `return-errors`: Plan stops execution
- Final result contains partial data or errors only

### When Step Returns Stop Signal

```typescript
return {
  data: resultData,
  signal: "stop",
  outcome: "success",
  $context,
};
```

- Plan execution stops immediately
- No further steps are executed
- Returns current data (both failure strategies)

## on-error Configuration

### Error Strategies

Plans can configure error handling at the step or plan level:

```yaml
steps:
  1:
    select:
      schema: users
      entity: data
      on-error:
        strategy: throw # Re-throw exception (stops plan)
        # strategy: skip    # Skip step execution
        # strategy: retry   # Retry with backoff
        # strategy: sink    # Send error to sink destination
        retry:
          attempts: 3
          delay: 1000
```

### Error Strategy Priority

1. **Step-level** `on-error` configuration takes precedence
2. **Plan-level** `on-error` is merged when step-level is missing
3. **Default**: Continue execution with failed outcome (for `return-data`) or stop (for `return-errors`)

## Configuration Examples

### Basic Plan with Partial Data (Default)

```yaml
plans:
  data-exploration:
    failure-strategy: return-data
    steps:
      - select:
          schema: users
          entity: data
      - transform:
          script: "transform.js"
      - insert:
          schema: processed
          entity: users
```

### Critical Pipeline with Errors Only

```yaml
plans:
  financial-pipeline:
    failure-strategy: return-errors
    steps:
      - select:
          schema: transactions
          entity: raw
          on-error:
            strategy: throw
      - validate:
          script: "validate.js"
      - insert:
          schema: ledger
          entity: transactions
```

## Context Structure

```typescript
interface TContext {
  $schema?: string;
  $plan: {
    name: string;
    failureStrategy: "return-data" | "return-errors";
    currentStep: {
      index?: number;
      command?: string;
      params?: any;
      status: STEP_STATUS;
    };
    data: DataTable;
    warnings?: Array<Warning>;
  };
  $vars: Record<string, any>;
}
```

## Best Practices

### Failure Strategy Selection

1. **Use `return-data`** for:
   - Data exploration and analysis
   - ML/AI pipelines where some failures are expected
   - Large datasets where partial progress is valuable

2. **Use `return-errors`** for:
   - Financial or critical business data
   - Traditional ETL workflows requiring consistency
   - Situations where partial data would cause issues

### Error Handling

1. **Use on-error configuration** for predictable error behavior
2. **Implement retry logic** for transient failures
3. **Use sink strategy** for error logging and monitoring
4. **Avoid throwing exceptions** in custom step functions

### Testing

1. **Test both failure strategies** with different scenarios
2. **Verify error-only responses** for critical pipelines
3. **Test signal handling** for flow control

## Migration Notes

### From Current Implementation

The current Metal behavior is preserved as the default (`return-data`):

```yaml
# Current behavior (unchanged)
plans:
  my-plan:
    # failure-strategy: return-data # This is the default
    steps:
      - select:
          schema: data
          entity: source
```

---
