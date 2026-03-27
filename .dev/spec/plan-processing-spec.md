# Plan Processing Evolution Specification

## Current State

The current plan processing uses a simple `for...of` loop to execute steps sequentially:

```typescript
for (const [_stepIndex, _step] of Object.entries(steps)) {
    // Step execution logic
}
```

**Limitations:**
- Rigid sequential execution
- Limited control flow (only basic break/continue)
- No step-level influence on execution flow
- Difficult to implement conditional logic

## Proposed Evolution: Enhanced Loop with Step Control

### Core Change

Replace the for loop with a controlled while loop that allows steps to influence execution:

```typescript
let stepIndex = 0
const stepEntries = Object.entries(steps)

while (stepIndex < stepEntries.length) {
    const [_stepIndex, _step] = stepEntries[stepIndex]
    const __stepIndex = Number.parseInt(_stepIndex, 10) + 1
    
    // Existing step execution logic
    const stepResult = await Step.ExecuteOnError(...)
    
    // NEW: Step can control next execution
    const nextStepIndex = await this._handleStepControl(
        stepResult, 
        stepIndex, 
        $context, 
        _step
    )
    
    if (nextStepIndex === -1) break // BREAK signal
    else if (nextStepIndex !== null) stepIndex = nextStepIndex // SKIP signal
    else stepIndex++ // Default: continue to next step
}
```

### Step Control Interface

```typescript
interface StepControl {
    action: 'continue' | 'break' | 'skip' | 'warn'
    skipCount?: number // for skip action (default: 1)
    warningMessage?: string // for warn action
    severity?: 'low' | 'medium' | 'high' // for warn action
    metadata?: any // additional control information
}

interface StepResult {
    data?: DataTable
    control?: StepControl
    metadata?: {
        warningMessage?: string
        errorDetails?: any
        skipReason?: string
    }
}
```

### Step Control Handler

```typescript
private async _handleStepControl(
    stepResult: DataTable | undefined,
    currentStepIndex: number,
    $context: Partial<TContext>,
    stepConfig: U__plans_plan__step
): Promise<number | null> {
    // Default: continue to next step
    if (!stepResult || !stepResult.control) {
        return null
    }
    
    const { action, skipCount, warningMessage, severity, metadata } = stepResult.control
    
    switch (action) {
        case 'break':
            Logger.Info(`Plan execution break at step ${currentStepIndex + 1}`)
            return -1 // Signal to break
            
        case 'skip':
            const skipSteps = skipCount || 1
            Logger.Info(`Skipping ${skipSteps} step(s) from step ${currentStepIndex + 1}`)
            return currentStepIndex + skipSteps // Jump to target step
            
        case 'warn':
            const warnLevel = severity || 'medium'
            Logger.Warn(`Warning at step ${currentStepIndex + 1}: ${warningMessage || 'No warning message'}`)
            // Store warning in context metadata
            if ($context.$plan) {
                $context.$plan.warnings = $context.$plan.warnings || []
                $context.$plan.warnings.push({
                    step: currentStepIndex + 1,
                    message: warningMessage,
                    severity: warnLevel,
                    timestamp: new Date().toISOString()
                })
            }
            return null // Continue to next step
            
        case 'continue':
        default:
            return null // Continue to next step
    }
}
```

## Implementation Phases

### Phase 1: Core Infrastructure
1. Add `StepControl` and `StepResult` interfaces
2. Implement `_handleStepControl` method
3. Modify main processing loop to use while loop
4. Update step execution to handle control signals

### Phase 2: Step Integration
1. Modify step functions to optionally return `StepResult`
2. Add control support to key step types (BREAK, conditional steps)
3. Update error handling to work with new control flow

### Phase 3: Advanced Features
1. Add if-then-else step type using skip control
2. Implement conditional logic based on data/state
3. Add parallel execution capabilities

## Backward Compatibility

- Existing step functions continue to work (return `DataTable | undefined`)
- Steps without control signals default to sequential execution
- Current error handling mechanisms remain intact

## Benefits

1. **Flexible Control Flow**: Steps can break, continue, skip, or warn during execution
2. **Future-Ready**: Perfect foundation for if-then-else and conditional logic
3. **Minimal Disruption**: Evolves existing architecture without breaking changes
4. **Enhanced Debugging**: Better tracking of execution flow and decisions
5. **Extensible**: Easy to add new control actions in the future

## Example Use Cases

### Basic Break
```typescript
// In a step function
return {
    data: resultData,
    control: { action: 'break' }
}
```

### Skip Next Steps (Foundation for if-then-else)
```typescript
// In a conditional step - if condition met, skip else branch
if (condition) {
    return {
        data: resultData,
        control: { action: 'skip', skipCount: 2 } // Skip 2 steps (else branch)
    }
}
```

### Warning with Metadata
```typescript
// In a step function with data quality issues
if (dataQualityWarning) {
    return {
        data: resultData,
        control: { 
            action: 'warn', 
            warningMessage: 'Data quality below threshold',
            severity: 'medium'
        }
    }
}
```

### Skip Multiple Steps
```typescript
// Jump ahead multiple steps based on condition
return {
    data: resultData,
    control: { action: 'skip', skipCount: 3 }
}
```

## Error Handling Strategy

### ETL Error Handling Best Practices

Based on standard ETL patterns and the current implementation:

#### 1. Current Implementation Behavior

**When Plan Encounters Error:**
- **Current Behavior**: Catches error, logs it, stops subsequent steps, returns partial data
- **Implementation**: Uses try-catch in Plan.Process(), always returns DataTable
- **Rationale**: Provides partial results for debugging, allows recovery

**When Plan is Stopped by User:**
- **Current Behavior**: Not implemented yet - would use step control signal
- **Implementation**: Should use step control `action: 'break'` instead of exceptions
- **Rationale**: Cleaner separation between flow control and error handling

**When Step Returns Failed Outcome:**
- **Current Behavior**: Continues execution with failed outcome, doesn't throw
- **Implementation**: Step.WrapStepWithSignal catches errors and returns failed outcome
- **Rationale**: Allows subsequent steps to handle failure conditions

#### 2. Current Error Handling Paths

**Path 1: Step Control (Non-Error Flow)**
```typescript
// Steps return T_StepResult with outcome: 'failed' but no exception
return {
    data: undefined,
    signal: 'next',
    outcome: 'failed',
    $context
}
// → Plan continues execution
```

**Path 2: Exception Handling (Error Flow)**
```typescript
// Step throws exception
throw new Error("Critical failure")
// → Caught by Plan.Process(), stops subsequent steps, returns partial data
```

#### 3. Current Implementation Details

**Plan.Process() Method:**
```typescript
try {
    // Execute all steps sequentially
    while (stepIndex < steps.length) {
        const _stepOutput = await _stepFunction(_stepParams, $context)
        // Handle step output, check for stop signals
        if (_stepOutput.signal === 'stop') break
        stepIndex++
    }
} catch (e: unknown) {
    // Log error, update context, but DON'T re-throw
    Logger.Error(`'${this.Name}': stopped at step ${stepIndex} because of error: ${e.message}`)
}

// Always return DataTable, even after errors
return this._data
```

**Step.WrapStepWithSignal() Method:**
```typescript
// Wraps step functions to catch errors and return T_StepResult
try {
    const data = await stepFunction(stepParams, $context)
    return { data, signal, outcome: 'success', $context }
} catch (error) {
    return { data: undefined, signal, outcome: 'failed', $context }
}
```

#### 4. Design Philosophy

**Current Design:**
- **Resilient over strict**: Better to provide partial data than fail completely
- **Debugging friendly**: Errors are logged but don't prevent inspection of partial results
- **Consistent interface**: Always returns DataTable, simplifies downstream handling

**Trade-offs:**
- **Pro**: Partial results available for debugging and recovery
- **Con**: Downstream systems must handle potentially incomplete data
- **Pro**: Simple error handling model
- **Con**: No distinction between different failure types

#### 5. Implementation Strategy (Future Evolution)

**Phase 1: Document Current Behavior**
- Update tests to match current implementation
- Fix misleading test labels
- Document current error handling behavior

**Phase 2: Enhanced Error Reporting (Optional)**
- Add error metadata to DataTable
- Include step failure information in context

**Phase 3: PlanResult Interface (Optional)**
- Consider PlanResult interface for new API endpoints
- Keep DataTable return for existing endpoints
- Gradual migration path

## Integration with Existing on-error

The step control system complements the existing `on-error` handling:

**Step Control**: Handles normal flow control and non-error conditions
```typescript
// Normal conditional logic
if (userCount === 0) {
    return { control: { action: 'skip', skipCount: 2 } }
}
```

**on-error**: Handles exceptional/error conditions
```yaml
steps:
  1:
    select:
      schema: users
      entity: data
      on-error:
        strategy: retry
        retry:
          attempts: 3
```

This separation ensures:
- **Clear separation of concerns**: Flow control vs error handling
- **No duplication**: retry, sink, skip error strategies remain in on-error
- **Enhanced capabilities**: Non-error based control flow
- **Future-ready**: Perfect foundation for if-then-else implementation

## Error Handling vs Step Control

### Step Control Path
- Step returns `StepResult` with control actions
- Handles **non-error** flow control (skip, warn, break, continue)
- Plan continues based on control signals

### Error Handling Path  
- Step throws exception → caught by `Step.ExecuteOnError`
- Routes through existing `on-error` strategies
- `on-error.throw` stops plan execution (fail-fast)
- `on-error.skip/sink/retry` handle error recovery

### Dual Path Example
```typescript
// Step can use both paths
async function MyStep(step, $context) {
    // Non-error conditional control
    if (someCondition) {
        return {
            data: result,
            control: { action: 'skip', skipCount: 2 }
        }
    }
    
    // Error condition
    if (criticalError) {
        throw new Error("Critical failure") // → on-error.throw
    }
    
    return { data: result }
}
```

### Compatibility with on-error.throw

The step control system is fully compatible with `on-error.throw`:

1. **Separate Paths**: Step control (return values) vs Error handling (exceptions)
2. **Fail-Fast Preserved**: `on-error.throw` still stops plan execution immediately
3. **Backward Compatible**: Existing error handling behavior unchanged
4. **Clear Separation**: Flow control decisions vs error conditions

```typescript
// Processing loop handles both paths
try {
    // Step execution
    const stepResult = await Step.ExecuteOnError(...)
    
    // Handle step control (non-error flow)
    const nextStepIndex = await this._handleStepControl(
        stepResult, stepIndex, $context, _step
    )
    
} catch (error) {
    // Error path - goes to on-error strategies
    // on-error.throw stops execution here
    throw error
}

```