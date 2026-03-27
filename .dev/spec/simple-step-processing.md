# Simple Step Processing Evolution

## Overview

A minimal evolution of the current step processing that adds signaling and basic hooks without complex architecture changes.

## Current State

Your current implementation in `Plan.ts` (lines 122-195):
```typescript
for (const [_stepIndex, _step] of Object.entries(steps)) {
    // ... step execution logic
    const __stepReturn = await Step.ExecuteOnError(
        __stepFunction,
        __stepArguments,
        $context,
        _step,
        planOnErrorConfig
    )
    // ... context updates
}
```

## Simple Evolution

### 1. Add Basic Signaling

```typescript
// Simple signal enum
enum StepSignal {
    CONTINUE = 'continue',
    STOP = 'stop',
    SKIP = 'skip'
}

// Add signal tracking to context
interface TContext {
    // ... existing context
    $signal?: StepSignal
}
```

### 2. Minimal Hook Interface

```typescript
// Simple hook function type
type StepHook = (context: TContext, step: any, error?: Error) => Promise<StepSignal | void>

// Simple hook registry
class SimpleHookRegistry {
    private hooks: StepHook[] = []
    
    addHook(hook: StepHook): void {
        this.hooks.push(hook)
    }
    
    async executeHooks(context: TContext, step: any, error?: Error): Promise<StepSignal> {
        for (const hook of this.hooks) {
            const signal = await hook(context, step, error)
            if (signal) return signal
        }
        return StepSignal.CONTINUE
    }
}
```

### 3. Updated Plan.Process Method

```typescript
// Simple evolution of existing loop
async Process(
    currentSchemaName: string | undefined,
    currentPlanName: string,
    planConfig: U__plans_plan,
): Promise<DataTable> {
    
    // ... existing setup code
    
    const hookRegistry = new SimpleHookRegistry()
    
    // Optional: Register default hooks based on config
    if (planConfig.hooks) {
        // Register configured hooks
    }
    
    try {
        for (const [_stepIndex, _step] of Object.entries(steps)) {
            
            // Check for stop signal before each step
            if ($context.$signal === StepSignal.STOP) {
                Logger.Info(`Plan stopped by signal at step ${__stepIndex}`)
                break
            }
            
            // ... existing step setup logic (lines 124-174)
            
            // Execute step with existing error handling
            const __stepReturn = await Step.ExecuteOnError(
                __stepFunction,
                __stepArguments,
                $context,
                _step,
                planOnErrorConfig
            )
            
            // Execute hooks after step completion
            const signal = await hookRegistry.executeHooks($context, _step)
            if (signal === StepSignal.STOP) {
                $context.$signal = signal
                break
            }
            
            // ... existing context update logic (lines 183-194)
        }
    } catch (e: unknown) {
        // Execute error hooks
        const signal = await hookRegistry.executeHooks($context, null, e as Error)
        if (signal === StepSignal.SKIP) {
            // Continue processing instead of throwing
            Logger.Info(`Error skipped by hook: ${e}`)
        } else {
            // Existing error handling
            throw e
        }
    }
    
    // ... existing return logic
}
```

## Configuration

### Simple Plan Configuration

```yaml
plans:
  my-plan:
    steps: [...]
    on-error: {...}
    
    # Simple hook configuration
    hooks:
      - type: "on-error-skip"
        config:
          errors: ["ValidationError", "DataError"]
      - type: "step-complete-log"
        config:
          level: "info"
```

### Built-in Simple Hooks

```typescript
// Example: Skip specific errors
const skipErrorsHook: StepHook = async (context, step, error) => {
    if (error && ["ValidationError", "DataError"].includes(error.name)) {
        Logger.Info(`Skipping step due to ${error.name}`)
        return StepSignal.SKIP
    }
}

// Example: Stop on specific conditions
const stopOnErrorHook: StepHook = async (context, step, error) => {
    if (error && error.message.includes("CRITICAL")) {
        Logger.Error(`Critical error detected, stopping plan`)
        return StepSignal.STOP
    }
}

// Example: Log step completion
const logStepHook: StepHook = async (context, step) => {
    Logger.Info(`Step completed: ${context.$plan.$current.stepCommand}`)
}
```

## Benefits of Simple Approach

### Immediate Benefits
- **Minimal Changes**: Only small modifications to existing `Plan.Process` method
- **Backward Compatible**: Existing plans work unchanged
- **Simple to Understand**: Clear signal-based flow control
- **Easy to Test**: Hook system is straightforward to unit test

### Addresses Your Requirements
- **Signaling**: `CONTINUE`, `STOP`, `SKIP` signals
- **Hook Functions**: Simple async hook interface
- **Error Control**: Hooks can intercept and handle errors
- **Data Passing**: Context continues to work as before

## Implementation Steps

### Step 1: Add Signal Types (1 hour)
1. Add `StepSignal` enum
2. Update `TContext` interface to include `$signal`
3. Create `SimpleHookRegistry` class

### Step 2: Update Plan.Process (2 hours)
1. Add hook registry initialization
2. Add signal check before step execution
3. Add hook execution after step completion
4. Add error hook execution in catch block

### Step 3: Add Basic Hooks (2 hours)
1. Create built-in hook functions
2. Add hook configuration parsing
3. Add hook registration from plan config

### Step 4: Testing (1 hour)
1. Unit tests for hook registry
2. Integration tests for signal flow
3. Test with existing error handling

## Example Usage

### Custom Hook Example

```typescript
// Custom hook to stop on data quality issues
const dataQualityHook: StepHook = async (context, step, error) => {
    if (error && error.message.includes("data quality")) {
        // Send notification
        await NotificationService.send({
            type: "plan_stopped",
            plan: context.$plan.name,
            reason: error.message
        })
        return StepSignal.STOP
    }
}

// Register hook
hookRegistry.addHook(dataQualityHook)
```

### Runtime Control

```typescript
// External control via context modification
planProcessor.setSignal(planId, StepSignal.STOP)

// Or via hook that checks external conditions
const externalControlHook: StepHook = async (context) => {
    const shouldStop = await ExternalService.shouldStopPlan(context.$plan.name)
    if (shouldStop) return StepSignal.STOP
}
```

## Migration Path

### Phase 1: Basic Implementation (Week 1)
- Implement signal enum and hook registry
- Update `Plan.Process` with minimal changes
- Add basic built-in hooks

### Phase 2: Configuration (Week 2)
- Add hook configuration parsing
- Implement configurable built-in hooks
- Add documentation

### Phase 3: Runtime Control (Week 3)
- Add external signal setting
- Implement webhook notifications
- Add monitoring hooks

## Comparison with Complex Approach

| Aspect | Simple Approach | Complex Approach |
|--------|----------------|------------------|
| Implementation Time | 1 week | 10 weeks |
| Learning Curve | Low | High |
| Maintenance | Easy | Complex |
| Flexibility | Good | Excellent |
| Performance | Minimal overhead | Some overhead |
| Backward Compatibility | 100% | 95% |

## Recommendation

Start with the simple approach. It provides:
- The signaling capabilities you need
- Basic hook functionality
- Minimal risk to existing functionality
- Easy path to extend later if needed

You can always evolve to the more complex architecture later if the requirements grow.
