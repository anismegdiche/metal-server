# Step Processing Architecture Specification

## Overview

This specification defines an event-driven step processing architecture that enhances the current sequential loop-based approach with signaling capabilities, hook system, and improved error handling integration. The new architecture maintains backward compatibility while providing extensibility for advanced use cases.

## Current State Analysis

### Existing Implementation
- **Location**: `src/modules/plan/Plan.ts` (lines 122-195)
- **Pattern**: Simple `for...of` loop over steps array
- **Error Handling**: Integrated via `Step.ExecuteOnError()` with strategies (throw, skip, retry, sink)
- **Context Management**: Maintains `$context` with plan state and current step info
- **Data Flow**: Each step receives and returns a `DataTable`

### Limitations
- No signaling capabilities (pause/resume/stop)
- Limited extensibility for custom processing logic
- Difficult to add cross-cutting concerns (metrics, logging, validation)
- Tight coupling between step execution and control flow

## Proposed Architecture

### Core Components

#### 1. PlanProcessor
Main orchestrator that replaces the simple for-loop with state management and event emission.

```typescript
interface PlanProcessor {
  // State management
  private state: PlanState
  private events: EventEmitter
  private hooks: Map<string, Hook[]>
  
  // Core execution
  async execute(plan: U__plans_plan, initialContext: TContext): Promise<DataTable>
  
  // State control
  async pause(): Promise<void>
  async resume(): Promise<void>
  async stop(): Promise<void>
  
  // Hook registration
  onStepStart(hook: StepHook): void
  onStepComplete(hook: StepHook): void
  onStepError(hook: ErrorHook): void
  onPlanComplete(hook: PlanHook): void
  onPlanError(hook: PlanErrorHook): void
}
```

#### 2. Event System
Defines all events that can be emitted during step processing.

```typescript
interface StepEvents {
  'step:start': { step: U__plans_plan__step, context: TContext }
  'step:complete': { result: DataTable, context: TContext }
  'step:error': { error: Error, context: TContext }
  'step:retry': { attempt: number, error: Error, context: TContext }
  'plan:start': { plan: U__plans_plan, context: TContext }
  'plan:complete': { result: DataTable, context: TContext }
  'plan:error': { error: Error, context: TContext }
  'plan:pause': { context: TContext }
  'plan:resume': { context: TContext }
  'plan:stop': { context: TContext }
}
```

#### 3. Hook System
Allows registration of custom processing logic at key points.

```typescript
interface Hook {
  id: string
  priority: number
  handler: (...args: any[]) => Promise<HookResult | void>
}

interface StepHook extends Hook {
  handler: (event: StepEvent) => Promise<HookAction | void>
}

interface ErrorHook extends Hook {
  handler: (event: ErrorEvent) => Promise<ErrorAction | void>
}

type HookAction = 'CONTINUE' | 'STOP' | 'RETRY' | 'SKIP'
type ErrorAction = 'THROW' | 'SKIP' | 'RETRY' | 'SINK'
```

#### 4. State Machine
Manages plan execution state and transitions.

```typescript
enum PlanState {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  STOPPED = 'stopped'
}

interface StateTransition {
  from: PlanState
  to: PlanState
  action: () => Promise<void>
}
```

## Detailed Implementation

### PlanProcessor Core Logic

```typescript
class PlanProcessor {
  private state: PlanState = PlanState.PENDING
  private events = new EventEmitter()
  private hooks = new Map<string, Hook[]>()
  private currentContext?: TContext

  async execute(plan: U__plans_plan, initialContext: TContext): Promise<DataTable> {
    this.state = PlanState.RUNNING
    this.currentContext = initialContext
    
    await this.events.emit('plan:start', { plan, context: initialContext })
    
    try {
      for (const [index, step] of plan.steps.entries()) {
        // Check state before each step
        if (this.state === PlanState.STOPPED) break
        while (this.state === PlanState.PAUSED) {
          await Utils.Sleep(100)
        }
        
        // Execute step with event emission
        const result = await this.executeStep(step, index, this.currentContext)
        this.currentContext = this.updateContext(this.currentContext, result)
      }
      
      this.state = PlanState.COMPLETED
      await this.events.emit('plan:complete', { 
        result: this.currentContext.$plan.$current.data, 
        context: this.currentContext 
      })
      
      return this.currentContext.$plan.$current.data
    } catch (error) {
      this.state = PlanState.FAILED
      await this.events.emit('plan:error', { error, context: this.currentContext })
      throw error
    }
  }

  private async executeStep(
    step: U__plans_plan__step, 
    index: number, 
    context: TContext
  ): Promise<DataTable> {
    // Emit step start event
    await this.events.emit('step:start', { step, context })
    
    // Apply step start hooks
    const startHooks = this.hooks.get('step:start') || []
    for (const hook of startHooks) {
      const action = await hook.handler({ step, context })
      if (action === 'STOP') throw new Error('__BREAK__')
    }
    
    try {
      // Execute step using existing error handling
      const stepFunction = Step.ExecuteCaseMap[context.$plan.$current.stepCommand!]
      const result = await Step.ExecuteOnError(
        stepFunction,
        this.createStepArgs(context),
        context,
        step,
        context.$plan.onErrorConfig
      )
      
      // Emit step complete event
      await this.events.emit('step:complete', { result, context })
      
      // Apply step complete hooks
      const completeHooks = this.hooks.get('step:complete') || []
      for (const hook of completeHooks) {
        await hook.handler({ result, context })
      }
      
      return result || context.$plan.$current.data
    } catch (error) {
      // Emit step error event
      await this.events.emit('step:error', { error, context })
      
      // Apply error hooks
      const errorHooks = this.hooks.get('step:error') || []
      for (const hook of errorHooks) {
        const action = await hook.handler({ error, context })
        if (action === 'SKIP') return context.$plan.$current.data
        if (action === 'RETRY') return await this.retryStep(step, context)
        if (action === 'THROW') throw error
      }
      
      throw error
    }
  }
}
```

### Hook Registration System

```typescript
interface HookRegistry {
  // Step lifecycle hooks
  registerStepStartHook(hook: StepHook): string
  registerStepCompleteHook(hook: StepHook): string
  registerStepErrorHook(hook: ErrorHook): string
  
  // Plan lifecycle hooks
  registerPlanStartHook(hook: PlanHook): string
  registerPlanCompleteHook(hook: PlanHook): string
  registerPlanErrorHook(hook: PlanErrorHook): string
  
  // Utility hooks
  registerMetricsHook(): string
  registerLoggingHook(): string
  registerValidationHook(): string
  
  // Hook management
  unregisterHook(hookId: string): void
  getHooks(type: string): Hook[]
}

// Built-in hooks examples
class MetricsHook implements StepHook {
  id = 'metrics'
  priority = 100
  
  async handler(event: StepEvent): Promise<void> {
    const startTime = Date.now()
    // Record step start metrics
    Metrics.increment('step.started', { 
      step: event.context.$plan.$current.stepCommand 
    })
  }
}

class LoggingHook implements StepHook {
  id = 'logging'
  priority = 50
  
  async handler(event: StepEvent): Promise<void> {
    Logger.info(`Step ${event.context.$plan.$current.stepIndex}: ${event.context.$plan.$current.stepCommand}`)
  }
}
```

### Integration with Existing Error Handling

The new architecture preserves your existing error handling investment:

```typescript
class PlanProcessor {
  private async executeStepWithErrorHandling(
    step: U__plans_plan__step,
    context: TContext
  ): Promise<DataTable> {
    // Use existing Step.ExecuteOnError method
    const stepFunction = Step.ExecuteCaseMap[context.$plan.$current.stepCommand!]
    
    return await Step.ExecuteOnError(
      stepFunction,
      this.createStepArgs(context),
      context,
      step,
      context.$plan.onErrorConfig
    )
  }
}
```

## Signaling Capabilities

### State Control API

```typescript
interface PlanController {
  // Runtime control
  async pausePlan(planId: string): Promise<void>
  async resumePlan(planId: string): Promise<void>
  async stopPlan(planId: string): Promise<void>
  
  // Status queries
  async getPlanStatus(planId: string): Promise<PlanStatus>
  async getRunningPlans(): Promise<PlanStatus[]>
  
  // Event subscriptions
  subscribeToPlanEvents(planId: string, callback: EventCallback): void
  unsubscribeFromPlanEvents(planId: string, callback: EventCallback): void
}

type PlanStatus = {
  id: string
  name: string
  state: PlanState
  currentStep?: number
  totalSteps: number
  startTime: Date
  progress: number
}
```

### Webhook Integration

```typescript
interface WebhookHook extends Hook {
  url: string
  events: string[]
  retryPolicy: RetryPolicy
}

class WebhookManager {
  async registerWebhook(config: WebhookConfig): Promise<string>
  async triggerWebhook(event: string, data: any): Promise<void>
  async removeWebhook(webhookId: string): Promise<void>
}
```

## Configuration

### Plan-Level Configuration

```yaml
plans:
  my-plan:
    # Existing configuration
    steps: [...]
    on-error: {...}
    
    # New processor configuration
    processor:
      # Enable/disable features
      enable-metrics: true
      enable-webhooks: false
      enable-validation: true
      
      # Hook configuration
      hooks:
        - type: metrics
          priority: 100
          config:
            include-step-timing: true
            include-data-volume: true
        - type: logging
          priority: 50
          config:
            level: info
            include-context: false
      
      # Webhook configuration
      webhooks:
        - url: https://api.example.com/webhooks/plan-events
          events: [step:start, step:complete, plan:complete]
          retry:
            attempts: 3
            delay: 1000
```

### Runtime Configuration

```typescript
interface ProcessorConfig {
  // Global settings
  maxConcurrentPlans: number
  defaultTimeout: number
  enableMetrics: boolean
  
  // Hook registry
  hooks: HookConfig[]
  
  // Event settings
  eventBufferSize: number
  eventRetention: number
  
  // State persistence
  persistState: boolean
  stateStorage: StateStorageConfig
}
```

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
1. Create `PlanProcessor` class with basic state management
2. Implement event emission system
3. Add hook registration infrastructure
4. Create wrapper around existing loop logic

**Deliverables:**
- `src/modules/plan/PlanProcessor.ts`
- `src/modules/plan/events/StepEvents.ts`
- `src/modules/plan/hooks/HookRegistry.ts`
- Basic unit tests

### Phase 2: Hook System (Week 3-4)
1. Implement built-in hooks (metrics, logging, validation)
2. Add hook priority system
3. Create hook configuration parsing
4. Add webhook integration

**Deliverables:**
- `src/modules/plan/hooks/built-in/` directory
- Hook configuration schemas
- Webhook management system
- Integration tests

### Phase 3: Signaling (Week 5-6)
1. Implement pause/resume/stop functionality
2. Add plan controller API
3. Create status monitoring system
4. Add event subscription system

**Deliverables:**
- `src/modules/plan/controller/PlanController.ts`
- Status monitoring endpoints
- Event subscription system
- End-to-end tests

### Phase 4: Integration (Week 7-8)
1. Replace existing loop in `Plan.ts`
2. Update configuration schemas
3. Add migration utilities
4. Performance optimization

**Deliverables:**
- Updated `Plan.ts` using new processor
- Configuration schema updates
- Migration utilities
- Performance benchmarks

### Phase 5: Documentation & Testing (Week 9-10)
1. Complete documentation
2. Add comprehensive tests
3. Create examples and tutorials
4. Performance tuning

**Deliverables:**
- Complete documentation
- Test coverage > 90%
- Example configurations
- Performance reports

## Benefits

### Immediate Benefits
- **Signaling**: Pause/resume/stop capabilities for long-running plans
- **Observability**: Built-in metrics and logging hooks
- **Extensibility**: Easy to add custom processing logic
- **Testability**: Better separation of concerns

### Long-term Benefits
- **Scalability**: Foundation for concurrent plan execution
- **Maintainability**: Cleaner architecture with less coupling
- **Monitoring**: Real-time plan status and progress tracking
- **Integration**: Webhook support for external system integration

### Backward Compatibility
- Existing plan configurations continue to work
- Current error handling strategies preserved
- API changes are additive, not breaking
- Migration path is gradual and reversible

## Performance Considerations

### Event System Overhead
- Event emission adds ~1-2ms per step
- Hook execution adds configurable overhead
- Memory usage increases by ~10-15%

### Optimization Strategies
- Lazy hook loading
- Event batching for high-frequency events
- Async hook execution where possible
- Configurable hook priority limits

### Benchmarks
- Target: <5% performance overhead with default hooks
- Target: <50ms additional latency for typical plans
- Target: <20MB additional memory usage

## Security Considerations

### Hook Security
- Hook code execution in sandboxed environment
- Resource limits for hook execution
- Validation of hook configurations

### Webhook Security
- HTTPS requirement for webhook URLs
- Signature verification for webhook payloads
- Rate limiting for webhook calls

### Access Control
- Role-based access to plan control APIs
- Audit logging for all plan state changes
- Permission checks for sensitive operations

---

This specification provides a comprehensive roadmap for evolving your step processing from a simple loop to a flexible, event-driven architecture while preserving your existing error handling investments.
