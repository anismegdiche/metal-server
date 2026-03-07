# Error Handling Specification

## Overview

Universal error handling provides robust failure management for all plan steps in Metal. This feature allows configurable error strategies at both plan-level (global defaults) and step-level (specific overrides).

## Configuration Structure

Error handling can be configured at two levels:

### Plan-Level Error Handling

Global default error handling strategy for all steps in the plan.

```yaml
plans:
  my-plan:
    on-error:
      strategy: "sink-on-error"
      sink:
        schema: errors
        entity: step_failures
```

### Step-Level Error Handling

Step-specific error handling that overrides plan-level defaults.

```yaml
plans:
  my-plan:
    my-entity:
      - select:
          schema: source
          entity: data
          on-error:
            strategy: "retry-then-sink"
            retry:
              attempts: 3
              delay: 1000
            sink:
              schema: errors
              entity: select_failures
```

## Error Strategies

### `throw` <Badge type="default" text="v0.1+" />

Default behavior. Stops plan execution and throws the error.

**Parameters:**

| Parameter | Type   | Required | Description                                        | Metal Version                         |
| --------- | ------ | -------- | -------------------------------------------------- | ------------------------------------- |
| `scope`   | String | N        | Error scope: "step" only (row scope not supported) | <Badge type="default" text="v0.1+" /> |

**Example:**

```yaml
on-error:
  strategy: "throw"
  scope: "step" # Only valid scope for throw strategy
```

**Important:** The `throw` strategy is only compatible with `scope: "step"`. When using `scope: "row"`, use `skip`, `sink`, or `retry` strategies instead.

### `skip` <Badge type="default" text="v0.1+" />

Skips the failed operation and continues with next steps. For row-level operations, skips problematic rows.

**Parameters:** None

**Example:**

```yaml
on-error:
  strategy: "skip"
```

### `sink` <Badge type="default" text="v0.1+" />

Moves failed data to a specified error destination for later analysis and reprocessing.

**Parameters:**

| Parameter            | Type    | Required | Description                                                | Metal Version                         |
| -------------------- | ------- | -------- | ---------------------------------------------------------- | ------------------------------------- |
| `scope`              | String  | N        | Error scope: "step" or "row" (default varies by step type) | <Badge type="default" text="v0.1+" /> |
| `sink.schema`        | String  | Y        | Error destination schema                                   | <Badge type="default" text="v0.1+" /> |
| `sink.entity`        | String  | Y        | Error destination entity                                   | <Badge type="default" text="v0.1+" /> |
| `sink.include-error` | Boolean | N        | Include error details in sink (default: true)              | <Badge type="default" text="v0.1+" /> |
| `sink.error-field`   | String  | N        | Field name for error details (default: "error_details")    | <Badge type="default" text="v0.1+" /> |

**Example:**

```yaml
on-error:
  strategy: "sink"
  scope: "row"
  sink:
    schema: errors
    entity: transform_failures
    include-error: true
    error-field: error_message
```

### `retry` <Badge type="default" text="v0.1+" />

Attempts to retry the failed operation before giving up.

**Parameters:**

| Parameter         | Type    | Required | Description                                                                   | Metal Version                         |
| ----------------- | ------- | -------- | ----------------------------------------------------------------------------- | ------------------------------------- |
| `scope`           | String  | N        | Error scope: "step" or "row" (default varies by step type)                    | <Badge type="default" text="v0.1+" /> |
| `retry.attempts`  | Integer | Y        | Maximum retry attempts (default: 3)                                           | <Badge type="default" text="v0.1+" /> |
| `retry.delay`     | Integer | N        | Delay between retries in milliseconds (default: 1000)                         | <Badge type="default" text="v0.1+" /> |
| `retry.backoff`   | String  | N        | Backoff strategy: "fixed", "linear", "exponential" (default: "fixed")         | <Badge type="default" text="v0.1+" /> |
| `retry.max-delay` | Integer | N        | Maximum delay for exponential/linear backoff in milliseconds (default: 30000) | <Badge type="default" text="v0.1+" /> |

**Example:**

```yaml
on-error:
  strategy: "retry"
  scope: "step"
  retry:
    attempts: 5
    delay: 2000
    backoff: exponential
    max-delay: 60000
```

## Error Scopes

The `scope` parameter determines whether error handling applies to the entire step or individual rows:

### `step` Scope

Error handling applies to the entire step operation. If the step fails, the whole step is retried/sunk/failed.

**Default for:** `select`, `insert`, `update`, `delete`, `run`, `sync`

**Behavior:**

- Connection errors → Entire step fails
- Invalid SQL → Entire step fails
- Missing table → Entire step fails
- Retry applies to whole step operation

### `row` Scope

Error handling applies to individual rows within the step. Failed rows are handled separately, successful rows continue.

**Default for:** `map`, `transform`

**Behavior:**

- Row validation error → Only that row fails
- Transformation error → Only that row fails
- Data format error → Only that row fails
- Retry applies to individual rows

**Strategy Compatibility:**
| Strategy | Compatible with Row Scope | Reason |
|----------|--------------------------|--------|
| `throw` | ❌ No | Would stop processing all rows |
| `skip` | ✅ Yes | Skips failed rows, continues processing |
| `sink` | ✅ Yes | Sinks failed rows, continues processing |
| `retry` | ✅ Yes | Retries failed rows, continues processing |
| `retry-then-sink` | ✅ Yes | Retries then sinks failed rows, continues processing |

**Example with explicit scope:**

```yaml
plans:
  my-plan:
    my-entity:
      - select:
          schema: source
          entity: users
          on-error:
            strategy: "retry-then-sink"
            scope: "step" # Explicit step-level (would be default anyway)
            retry:
              attempts: 3
            sink:
              schema: errors
              entity: select_failures

      - map:
          script: |
            $row.email = $row.email.toLowerCase();
            return $row;
          on-error:
            strategy: "sink"
            scope: "row" # Explicit row-level (would be default anyway)
            sink:
              schema: errors
              entity: invalid_emails
```

### Backoff Strategies

The `retry.backoff` parameter determines how delay increases between retry attempts:

#### `fixed` (Default)

Same delay for all retry attempts.

**Formula:** `delay = initial_delay`

**Example:** `delay: 2000` → 2s, 2s, 2s, 2s, 2s

#### `linear`

Delay increases linearly with each attempt.

**Formula:** `delay = min(initial_delay × attempt, max_delay)`

**Example:** `delay: 1000` → 1s, 2s, 3s, 4s, 5s (capped at `max-delay`)

#### `exponential`

Delay increases exponentially with each attempt.

**Formula:** `delay = min(initial_delay × (2 ^ (attempt - 1)), max_delay)`

**Example:** `delay: 1000` → 1s, 2s, 4s, 8s, 16s (capped at `max-delay`)

### `retry-then-sink` <Badge type="default" text="v0.1+" />

Combines retry strategy with sink fallback. Retries specified attempts, then sinks failed data.

**Parameters:** Combines both `retry` and `sink` parameters.

**Example:**

```yaml
on-error:
  strategy: "retry-then-sink"
  retry:
    attempts: 3
    delay: 1000
  sink:
    schema: errors
    entity: retry_failures
```

## Error Context Variables

When errors occur, the following context variables are available for error handling:

| Variable           | Description               | Available In     |
| ------------------ | ------------------------- | ---------------- |
| `$error.message`   | Error message text        | All strategies   |
| `$error.type`      | Error type/classification | All strategies   |
| `$error.step`      | Step that failed          | All strategies   |
| `$error.timestamp` | When error occurred       | All strategies   |
| `$error.attempt`   | Current retry attempt     | Retry strategies |

## Error Sink Schema

Error sink destinations automatically receive these fields:

| Field           | Type         | Description                                                             |
| --------------- | ------------ | ----------------------------------------------------------------------- |
| `original_data` | Object/Array | The data that failed processing (varies by step type)                   |
| `error_details` | Object       | Error information matching context variables (if `include-error: true`) |
| `step_info`     | Object       | Step context (step index, command, etc.)                                |
| `timestamp`     | String       | When the error occurred                                                 |
| `attempt`       | Integer      | Retry attempt number (if applicable)                                    |

### `error_details` Field Structure

The `error_details` field contains the same structure as the context variables:

```json
{
  "error_details": {
    "message": "Invalid email format",
    "type": "validation-error",
    "step": "map",
    "timestamp": "2024-01-15T10:30:45.123Z",
    "attempt": 2
  }
}
```

**Mapping to context variables:**

- `error_details.message` → `$error.message`
- `error_details.type` → `$error.type`
- `error_details.step` → `$error.step`
- `error_details.timestamp` → `$error.timestamp`
- `error_details.attempt` → `$error.attempt`

### `original_data` Field Contents

The `original_data` field varies depending on the step type and failure scenario:

#### For Row-Level Operations (`map`, `transform`)

**Contains:** Single row object that failed

```json
{
  "original_data": {
    "id": 123,
    "name": "John Doe",
    "email": "invalid-email-format"
  }
}
```

#### For Bulk Operations (`select`, `insert`, `update`)

**Contains:** Array of rows being processed when error occurred

```json
{
  "original_data": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" },
    { "id": 3, "name": "Charlie" }
  ]
}
```

#### For Connection/Source Operations

**Contains:** Query parameters or configuration that failed

```json
{
  "original_data": {
    "schema": "source_db",
    "entity": "users",
    "filter": "age > 18",
    "fields": "id,name,email"
  }
}
```

#### For AI/External Service Operations (`run`)

**Contains:** Input data sent to the service

```json
{
  "original_data": {
    "input": "Analyze this customer feedback...",
    "model": "sentiment-analysis",
    "params": { "language": "en" }
  }
}
```

## Implementation Examples

### Complete Error Handling Configuration

```yaml
plans:
  data-pipeline:
    # Global error handling defaults
    on-error:
      strategy: "retry-then-sink"
      retry:
        attempts: 2
        delay: 500
      sink:
        schema: errors
        entity: pipeline_failures

    raw-data:
      - select:
          schema: source
          entity: raw_data
          # Step-specific error handling
          on-error:
            strategy: "retry-then-sink"
            retry:
              attempts: 5
              delay: 2000
              backoff: exponential
            sink:
              schema: errors
              entity: source_failures

      - transform:
          script: |
            $row.processed_at = new Date().toISOString();
            $row.status = "processed";
            return $row;
          on-error:
            strategy: "sink"
            sink:
              schema: errors
              entity: transform_failures

      - insert:
          schema: target
          entity: processed_data
          on-error:
            strategy: "retry"
            retry:
              attempts: 3
              delay: 1000
```

## Migration Notes

- Existing plans without `on-error` configuration will continue to work with default `throw` behavior
- Step-level `on-error` overrides plan-level settings
- Error handling is applied per-step, not per-plan
- Focus on core strategies: throw, skip, sink, retry, retry-then-sink
