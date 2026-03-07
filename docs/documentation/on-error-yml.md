---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

# Error Handling Configuration

The `on-error` parameter provides robust error handling for plan steps in Metal. This feature allows configurable error strategies to handle failures gracefully during data processing operations.

## Overview

Error handling can be configured at two levels:

### Step-Level Error Handling

Step-specific error handling that applies to individual data processing steps.

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

## Supported Steps

The `on-error` parameter is supported by data processing steps:

| Step Command        | Description                      | Support Level   |
| ------------------- | -------------------------------- | --------------- |
| `select`            | Select data from an entity       | ✅ Full Support |
| `insert`            | Insert data to an entity         | ✅ Full Support |
| `delete`            | Delete data from an entity       | ✅ Full Support |
| `update`            | Update data of an entity         | ✅ Full Support |
| `join`              | Perform data joins               | ✅ Full Support |
| `sort`              | Sort data                        | ✅ Full Support |
| `run`               | Run AI Engine operations         | ✅ Full Support |
| `sync`              | Synchronize data between sources | ✅ Full Support |
| `anonymize`         | Anonymize data fields            | ✅ Full Support |
| `remove-duplicates` | Remove duplicate rows            | ✅ Full Support |
| `pick`              | Keep specific fields             | ✅ Full Support |
| `omit`              | Remove specific fields           | ✅ Full Support |
| `map`               | Transform data with JavaScript   | ✅ Full Support |
| `list-entities`     | List entities in schema          | ✅ Full Support |

### Not Supported

Control/utility steps do not support error handling:

| Step Command | Reason                   |
| ------------ | ------------------------ |
| `debug`      | Debug control step       |
| `break`      | Execution control step   |
| `set-var`    | Variable assignment step |

## Error Strategies

### `throw` <Badge type="info" text="v0.5+" />

Default behavior. Stops plan execution and throws the error.

**Parameters:**

| Parameter | Type   | Required | Description                                        | Metal Version                      |
| --------- | ------ | -------- | -------------------------------------------------- | ---------------------------------- |
| `scope`   | String | N        | Error scope: "step" only (row scope not supported) | <Badge type="info" text="v0.5+" /> |

**Example:**

```yaml
on-error:
  strategy: "throw"
  scope: "step" # Only valid scope for throw strategy
```

**Important:** The `throw` strategy is only compatible with `scope: "step"`. When using `scope: "row"`, use `skip`, `sink`, or `retry` strategies instead.

### `skip` <Badge type="info" text="v0.5+" />

Skips the failed operation and continues with next steps. For row-level operations, skips problematic rows.

**Parameters:** None

**Example:**

```yaml
on-error:
  strategy: "skip"
```

### `sink` <Badge type="info" text="v0.5+" />

Moves failed data to a specified error destination for later analysis and reprocessing.

**Parameters:**

| Parameter            | Type    | Required | Description                                                | Metal Version                      |
| -------------------- | ------- | -------- | ---------------------------------------------------------- | ---------------------------------- |
| `scope`              | String  | N        | Error scope: "step" or "row" (default varies by step type) | <Badge type="info" text="v0.5+" /> |
| `sink.schema`        | String  | Y        | Error destination schema                                   | <Badge type="info" text="v0.5+" /> |
| `sink.entity`        | String  | Y        | Error destination entity                                   | <Badge type="info" text="v0.5+" /> |
| `sink.include-error` | Boolean | N        | Include error details in sink (default: true)              | <Badge type="info" text="v0.5+" /> |
| `sink.error-field`   | String  | N        | Field name for error details (default: "error_details")    | <Badge type="info" text="v0.5+" /> |

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

### `retry` <Badge type="info" text="v0.5+" />

Attempts to retry the failed operation before giving up.

**Parameters:**

| Parameter         | Type    | Required | Description                                                                   | Metal Version                      |
| ----------------- | ------- | -------- | ----------------------------------------------------------------------------- | ---------------------------------- |
| `scope`           | String  | N        | Error scope: "step" or "row" (default varies by step type)                    | <Badge type="info" text="v0.5+" /> |
| `retry.attempts`  | Integer | Y        | Maximum retry attempts (default: 3)                                           | <Badge type="info" text="v0.5+" /> |
| `retry.delay`     | Integer | N        | Delay between retries in milliseconds (default: 1000)                         | <Badge type="info" text="v0.5+" /> |
| `retry.backoff`   | String  | N        | Backoff strategy: "fixed", "linear", "exponential" (default: "fixed")         | <Badge type="info" text="v0.5+" /> |
| `retry.max-delay` | Integer | N        | Maximum delay for exponential/linear backoff in milliseconds (default: 30000) | <Badge type="info" text="v0.5+" /> |

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

### `retry-then-sink` <Badge type="info" text="v0.5+" />

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

## Implementation Examples

### Basic Error Handling

```yaml
plans:
  data-pipeline:
    raw-data:
      - select:
          schema: source
          entity: raw_data
          on-error:
            strategy: "skip"

      - map:
          script: |
            $row.processed_at = new Date().toISOString();
            return $row;
          on-error:
            strategy: "sink"
            sink:
              schema: errors
              entity: map_failures

      - insert:
          schema: target
          entity: processed_data
          on-error:
            strategy: "retry"
            retry:
              attempts: 3
              delay: 1000
```

### Advanced Error Handling with Retry and Sink

```yaml
plans:
  critical-pipeline:
    data:
      - select:
          schema: external_api
          entity: data
          on-error:
            strategy: "retry-then-sink"
            retry:
              attempts: 5
              delay: 2000
              backoff: exponential
              max-delay: 60000
            sink:
              schema: errors
              entity: api_failures
              include-error: true

      - map:
          script: |
            $row.normalized = $row.value.toLowerCase().trim();
            return $row;
          on-error:
            strategy: "skip"
```
