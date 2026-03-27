# Checkpoint Command Specification

## Overview

The checkpoint command allows users to explicitly save the current state of data processing at specific points in a plan. This provides manual recovery points without the complexity of automatic rollback systems.

## Checkpoint Step

The checkpoint command is a regular step that copies the current data state to a specified destination:

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

## Checkpoint Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | String | Y | Unique identifier for this checkpoint |
| `destination.schema` | String | Y | Target schema for checkpoint data |
| `destination.entity` | String | Y | Target entity for checkpoint data |
| `include-metadata` | Boolean | N | Include plan context and step info (default: true) |
| `overwrite` | Boolean | N | Overwrite existing checkpoint with same name (default: false) |

## Checkpoint Data Structure

Checkpoints store the complete state needed for recovery:

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

## Implementation

### Step Function Registration

```typescript
Step.ExecuteCaseMap['checkpoint'] = CheckpointStep
```

### Checkpoint Step Logic

```typescript
async function CheckpointStep(params: CheckpointParams, context: TContext): Promise<T_StepResult> {
    try {
        const { name, destination, includeMetadata = true, overwrite = false } = params
        
        // Check if checkpoint already exists
        if (!overwrite && await checkpointExists(name, destination)) {
            throw new Error(`Checkpoint '${name}' already exists`)
        }
        
        // Prepare checkpoint data
        const checkpointData: CheckpointData = {
            name,
            timestamp: new Date().toISOString(),
            planName: context.$plan.name,
            stepIndex: context.$plan.currentStep.index || 0,
            data: context.$plan.data,
            metadata: includeMetadata ? {
                context,
                planConfig: getPlanConfig(context.$plan.name),
                stepHistory: context.$plan.stepHistory || []
            } : undefined
        }
        
        // Save checkpoint to destination
        await saveCheckpoint(destination, checkpointData)
        
        // Update context with checkpoint info
        const updatedContext = {
            ...context,
            $plan: {
                ...context.$plan,
                checkpoints: [...(context.$plan.checkpoints || []), name]
            }
        }
        
        return {
            data: context.$plan.data,
            signal: 'next',
            outcome: 'success',
            $context: updatedContext
        }
        
    } catch (error) {
        return {
            data: undefined,
            signal: 'next',
            outcome: 'failed',
            $context: context
        }
    }
}
```

## Configuration Examples

### Pipeline with Strategic Checkpoints

```yaml
plans:
  ml-training-pipeline:
    failure-strategy: partial_data
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
      - checkpoint:
          name: "model-trained"
          destination:
            schema: checkpoints
            entity: ml_training
```

### Critical Pipeline with Checkpoints

```yaml
plans:
  financial-pipeline:
    failure-strategy: errors_only
    steps:
      - select:
          schema: transactions
          entity: raw
      - checkpoint:
          name: "data-extracted"
          destination:
            schema: checkpoints
            entity: financial
          include-metadata: true
      - validate:
          script: "validate.js"
      - checkpoint:
          name: "data-validated"
          destination:
            schema: checkpoints
            entity: financial
      - insert:
          schema: ledger
          entity: transactions
```

## Checkpoint Recovery

### Manual Recovery Process

1. **Identify checkpoint** to restore from
2. **Load checkpoint data** from checkpoint destination
3. **Create recovery plan** that starts from the checkpoint step
4. **Execute recovery plan** with restored data

### Recovery Plan Example

```yaml
plans:
  recover-from-checkpoint:
    steps:
      - load-checkpoint:
          name: "data-preprocessed"
          source:
            schema: checkpoints
            entity: ml_training
      - train:
          model: "classification"
      - evaluate:
          metrics: ["accuracy", "precision", "recall"]
```

## Context Updates

The plan context is updated after checkpoint creation:

```typescript
$context = merge($context, {
    $plan: {
        checkpoints: [...(context.$plan.checkpoints || []), checkpointName]
    }
})
```

## Best Practices

### Checkpoint Placement

1. **Place checkpoints strategically** after major data transformations
2. **Use descriptive names** for easy identification
3. **Consider storage costs** for large datasets
4. **Balance frequency** with performance overhead

### Checkpoint Management

1. **Clean up old checkpoints** to manage storage
2. **Use overwrite option** for development environments
3. **Include metadata** for debugging and recovery
4. **Document checkpoint strategy** for team members

### Error Handling

1. **Handle checkpoint failures** gracefully
2. **Use on-error configuration** for checkpoint steps
3. **Monitor checkpoint storage** usage
4. **Test recovery procedures** regularly

## Storage Considerations

### Large Datasets

For large datasets, consider:

- **Compression** of checkpoint data
- **Incremental checkpoints** (only store changes)
- **Separate storage** for checkpoint data
- **Retention policies** for old checkpoints

### Performance Impact

Checkpoints add overhead to plan execution:

- **Data copy time** increases with dataset size
- **Storage I/O** can impact overall performance
- **Network latency** if using remote storage
- **Concurrent access** considerations

## Testing

### Checkpoint Creation

1. **Test checkpoint creation** with different data sizes
2. **Verify metadata inclusion** when enabled
3. **Test overwrite behavior**
4. **Test error handling** for invalid destinations

### Recovery Testing

1. **Test data restoration** from checkpoints
2. **Verify plan resumes** correctly from checkpoint
3. **Test metadata recovery** for debugging
4. **Test recovery plan execution**

---

This specification provides explicit checkpoint management while maintaining simplicity and avoiding the complexity of automatic rollback systems.
