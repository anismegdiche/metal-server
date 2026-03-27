# Plan Behavior Specification

## Overview

This document defines how the Plan system works with configurable failure behavior and checkpoint commands. It focuses on the actual implementation and intended behavior, providing both traditional ETL and fault-tolerant options.

## Plan Configuration

### Failure Behavior

Plans can configure how they handle failures at the plan level:

```yaml
plans:
  my-plan:
    failure-behavior: partial_data  # Default (current Metal behavior)
    # or
    failure-behavior: errors_only   # Stop on error, return only error info
```

#### Failure Behavior Options

| Option | Behavior | Use Case |
|--------|----------|----------|
| `partial_data` | Continue execution on errors, return processed data | Data exploration, ML pipelines, fault-tolerant processing |
| `errors_only` | Stop on first error, return only error information | Critical data pipelines, financial transactions, traditional ETL |

## Current Implementation

### Plan Processing Loop

The Plan class uses a `while` loop to execute steps sequentially:

```typescript
let stepIndex = 0
while (stepIndex < steps.length) {
    const _step = steps[stepIndex]
    // Execute step
    const _stepOutput = await _stepFunction(_stepParams, $context)
    // Handle result
    if (_stepOutput.signal === 'stop') break
    
    // Check failure behavior
    if (this.failureBehavior === 'errors_only' && _stepOutput.outcome === 'failed') {
        break // Stop execution on first error
    }
    
    stepIndex++
}
```

### Step Execution

Each step is executed through the `Step.ExecuteCaseMap` which contains wrapped step functions:

```typescript
const _stepFunction = Step.ExecuteCaseMap[_stepCommand]
const _stepOutput = await _stepFunction(_stepParams, $context)
```

### Step Output Structure

Steps return a `T_StepResult`:

```typescript
interface T_StepResult {
    data?: DataTable
    signal: 'next' | 'stop'
    outcome: 'success' | 'failed'
    $context: TContext
}
```

### Error Handling

#### Step Level Error Handling

The `Step.WrapStepWithSignal` method wraps step functions to catch errors:

```typescript
try {
    const data = await stepFunction(stepParams, $context)
    return { data, signal, outcome: 'success', $context }
} catch (error) {
    return { data: undefined, signal, outcome: 'failed', $context }
}
```

#### Plan Level Error Handling

The `Plan.Process` method handles errors based on failure behavior:

```typescript
try {
    // Execute steps
} catch (e: unknown) {
    Logger.Error(`'${this.Name}': stopped at step ${stepIndex} because of error: ${e.message}`)
    
    if (this.failureBehavior === 'errors_only') {
        return { errors: [{ step: stepIndex, error: e.message }] }
    }
}

// Return based on failure behavior
if (this.failureBehavior === 'errors_only' && hasErrors) {
    return { errors: errorDetails }
} else {
    return this._data // Always return DataTable for partial_data
}
```

### Signal Handling

#### Next Signal (Default)

```typescript
{ signal: 'next' }  // Continue to next step
```

#### Stop Signal

```typescript
{ signal: 'stop' }  // Break execution loop
```

When a step returns `signal: 'stop'`, the plan execution breaks immediately and returns the current data regardless of failure behavior.

## Checkpoint Command

### Checkpoint Step

The checkpoint command allows users to explicitly save the current state of data processing:

```yaml
plans:
  my-plan:
    steps:
      - select:
          schema: source
          entity: raw_data
      - checkpoint:
          name: "after-data-load"
          destination:
            schema: checkpoints
            entity: plan_snapshots
          include-metadata: true
      - transform:
          script: "transform.js"
      - checkpoint:
          name: "after-transform"
          destination:
            schema: checkpoints
            entity: plan_snapshots
```

### Checkpoint Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | String | Y | Unique identifier for this checkpoint |
| `destination.schema` | String | Y | Target schema for checkpoint data |
| `destination.entity` | String | Y | Target entity for checkpoint data |
| `include-metadata` | Boolean | N | Include plan context and step info (default: true) |
| `overwrite` | Boolean | N | Overwrite existing checkpoint with same name (default: false) |

### Checkpoint Data Structure

Checkpoints store:

```typescript
interface CheckpointData {
    name: string
    timestamp: string
    planName: string
    stepIndex: number
    data: DataTable // Current processing data
    metadata?: {
        context: TContext
        planConfig: any
        stepHistory: Array<{
            stepIndex: number
            command: string
            outcome: 'success' | 'failed'
            timestamp: string
        }>
    }
}
```

## Error Handling Behavior

### When Step Throws Exception

1. **Step.WrapStepWithSignal** catches the exception
2. Returns `{ data: undefined, signal: 'next', outcome: 'failed' }`
3. **Plan behavior depends on failure-behavior**:
   - `partial_data`: Continue to next step with failed outcome
   - `errors_only`: Stop execution immediately

### When Step Returns Failed Outcome

```typescript
return {
    data: undefined,
    signal: 'next',
    outcome: 'failed',
    $context
}
```

- `partial_data`: Plan continues execution
- `errors_only`: Plan stops execution
- Final result contains partial data or errors only

### When Step Returns Stop Signal

```typescript
return {
    data: resultData,
    signal: 'stop',
    outcome: 'success',
    $context
}
```

- Plan execution stops immediately
- No further steps are executed
- Returns current data (both failure behaviors)

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
        strategy: throw    # Re-throw exception (stops plan)
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
3. **Default**: Continue execution with failed outcome (for `partial_data`) or stop (for `errors_only`)

## Data Flow

### Input Data

Each step receives:
- `stepParams`: Step configuration parameters
- `$context`: Execution context with plan state

### Output Data

Each step returns:
- `data`: Optional DataTable result
- `signal`: Execution control signal
- `outcome`: Success/failure indicator
- `$context`: Updated context

### Context Updates

The plan context is updated after each step:

```typescript
$context = merge($context, {
    $plan: {
        currentStep: {
            status: STEP_STATUS.COMPLETED,
        },
        data: this._data,
    },
})
```

## Configuration Examples

### Basic Plan with Partial Data (Default)

```yaml
plans:
  data-exploration:
    failure-behavior: partial_data
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
    failure-behavior: errors_only
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

### Pipeline with Checkpoints

```yaml
plans:
  ml-training-pipeline:
    failure-behavior: partial_data
    steps:
      - select:
          schema: training_data
          entity: raw
      - checkpoint:
          name: "raw-data-loaded"
          destination:
            schema: checkpoints
            entity: ml_training
      - transform:
          script: "preprocess.js"
      - checkpoint:
          name: "data-preprocessed"
          destination:
            schema: checkpoints
            entity: ml_training
      - train:
          model: "classification"
```

## Implementation Details

### Step Function Registration

```typescript
Step.ExecuteCaseMap['select'] = Step.WrapStepWithSignal(SelectStep)
Step.ExecuteCaseMap['insert'] = Step.WrapStepWithSignal(InsertStep)
Step.ExecuteCaseMap['checkpoint'] = CheckpointStep
```

### Context Structure

```typescript
interface TContext {
    $schema?: string
    $plan: {
        name: string
        failureBehavior: 'partial_data' | 'errors_only'
        currentStep: {
            index?: number
            command?: string
            params?: any
            status: STEP_STATUS
        }
        data: DataTable
        warnings?: Array<Warning>
        checkpoints?: Array<string> // Names of checkpoints created
    }
    $vars: Record<string, any>
}
```

### Step Status

```typescript
enum STEP_STATUS {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed'
}
```

## Best Practices

### Failure Behavior Selection

1. **Use `partial_data`** for:
   - Data exploration and analysis
   - ML/AI pipelines where some failures are expected
   - Large datasets where partial progress is valuable

2. **Use `errors_only`** for:
   - Financial or critical business data
   - Traditional ETL workflows requiring consistency
   - Situations where partial data would cause issues

### Checkpoint Usage

1. **Place checkpoints strategically** after major data transformations
2. **Use descriptive names** for easy identification
3. **Include metadata** for debugging and recovery
4. **Consider storage costs** for large datasets

### Error Handling

1. **Use on-error configuration** for predictable error behavior
2. **Implement retry logic** for transient failures
3. **Use sink strategy** for error logging and monitoring
4. **Avoid throwing exceptions** in custom step functions

### Testing

1. **Test both failure behaviors** with different scenarios
2. **Test checkpoint creation and recovery**
3. **Verify error-only responses** for critical pipelines
4. **Test signal handling** for flow control

## Migration Notes

### From Current Implementation

The current Metal behavior is preserved as the default (`partial_data`):

```yaml
# Current behavior (unchanged)
plans:
  my-plan:
    # failure-behavior: partial_data # This is the default
    steps:
      - select:
          schema: data
          entity: source
```

### Adding Checkpoints to Existing Plans

Checkpoints can be added without changing existing behavior:

```yaml
plans:
  existing-plan:
    steps:
      - select:
          schema: source
          entity: data
      # Add checkpoint here
      - checkpoint:
          name: "after-select"
          destination:
            schema: checkpoints
            entity: plan_snapshots
      - transform:
          script: "process.js"
```

---

This specification provides flexible failure handling and explicit checkpoint management while maintaining backward compatibility with existing Metal ETL workflows.