---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

# Error Handling Configuration

The `on-error` parameter provides robust error handling for plan steps in Metal. This feature allows configurable error strategies to handle failures gracefully during data processing operations. can be configured at three levels:

| Level            | Description                                               |
| ---------------- | --------------------------------------------------------- |
| **Plan-Level**   | Default for entire plan execution.                        |
| **Entity-Level** | Default for all steps within a specific entity in a plan. |
| **Step-Level**   | Specific to an individual step. Overrides entity-level.   |

## Overview

Error handling can be configured at three levels:

| Level            | Description                                               |
| ---------------- | --------------------------------------------------------- |
| **Plan-Level**   | Default for entire plan execution.                        |
| **Entity-Level** | Default for all steps within a specific entity in a plan. |
| **Step-Level**   | Specific to an individual step. Overrides entity-level.   |

### Plan-Level Error Handling

Error handling for entire plan execution failures.

```yaml
plans:
  my-plan:
    on-error:
      strategy: throw
      scope: plan
```

### Entity-Level Error Handling

Global error handling for a specific entity in a plan.

```yaml
plans:
  my-plan:
    my-entity:
      on-error:
        strategy: retry
        retry:
          attempts: 3
          then: throw
        scope: entity
```

### Step-Level Error Handling

Error handling for individual data processing steps (select, insert, update, delete, etc.).

```yaml
plans:
  my-plan:
    my-entity:
      steps:
        - select:
            schema: source
            entity: data
            on-error:
              strategy: skip
              scope: step
```

### Row-Level Error Handling

Error handling for individual data transformation rows (map, transform, validation operations).

```yaml
plans:
  my-plan:
    my-entity:
      steps:
        - map:
            script: |
              $row.processed_at = new Date().toISOString();
              return $row;
            on-error:
              strategy: sink
              scope: row
              sink:
                schema: errors
                entity: transform_failures
```

## Supported Steps

The `on-error` parameter is supported by data processing steps:

| Step Command        | Description                      | Support Level     |
| ------------------- | -------------------------------- | ----------------- |
| `select`            | Select data from an entity       | Full Support      |
| `insert`            | Insert data to an entity         | Full Support      |
| `delete`            | Delete data from an entity       | Full Support      |
| `update`            | Update data of an entity         | Full Support      |
| `join`              | Perform data joins               | Full Support      |
| `sort`              | Sort data                        | Full Support      |
| `run`               | Run AI Engine operations         | Full Support      |
| `sync`              | Synchronize data between sources | Full Support      |
| `anonymize`         | Anonymize data fields            | Full Support      |
| `remove-duplicates` | Remove duplicate rows            | Full Support      |
| `list-entities`     | List entities in schema          | Full Support      |
| `break`             | Execution control step           | No Error Handling |
| `set-var`           | Variable assignment step         | No Error Handling |
| `debug`             | Debug control step               | No Error Handling |
| `pick`              | Keep specific fields             | Full Support      |
| `omit`              | Remove specific fields           | Full Support      |
| `map`               | Transform data with JavaScript   | Full Support      |

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

**Example:**

```yaml
on-error:
  strategy: throw
  scope: step
```

### `skip` <Badge type="info" text="v0.5+" />

Skips the failed operation and continues with next steps. For row-level operations, skips problematic rows.

**Parameters:** None

**Example:**

```yaml
on-error:
  strategy: skip
  scope: step
```

### `sink` <Badge type="info" text="v0.5+" />

Moves failed data to a specified error destination for later analysis and reprocessing.

**Parameters:**

| Parameter          | Type   | Required | Description                                          | Metal Version                      |
| --------- | ------ | -------- | ---------------------------------------------------- | ---------------------------------- |
| `scope`   | String | N        | Error scope: `step` or `row`                             | <Badge type="info" text="v0.5+" /> |
| `sink.schema`        | String  | Y        | Error destination schema                                | <Badge type="info" text="v0.5+" /> |
| `sink.entity`        | String  | Y        | Error destination entity                                | <Badge type="info" text="v0.5+" /> |
| `sink.include-error` | Boolean | N        | Include error details in sink (default: `true`)         | <Badge type="info" text="v0.5+" /> |
| `sink.error-field`   | String  | N        | Field name for error details (default: `error_details`) | <Badge type="info" text="v0.5+" /> |

**Example:**

```yaml
on-error:
  strategy: sink
  scope: row
  sink:
    schema: errors
    entity: transform_failures
    include-error: true
    error-field: error_message
```

### `retry` <Badge type="info" text="v0.5+" />

Attempts to retry the failed operation, then applies a fallback strategy.

**Parameters:**

| Parameter         | Type    | Required | Description                                                                     | Metal Version                      |
| ----------------- | ------- | -------- | ------------------------------------------------------------------------------- | ---------------------------------- |
| `scope`           | String  | N        | Error scope: `step` or `row` (default varies by step type)                      | <Badge type="info" text="v0.5+" /> |
| `retry.attempts`  | Integer | Y        | Maximum retry attempts (default: `3`)                                           | <Badge type="info" text="v0.5+" /> |
| `retry.delay`     | Integer | N        | Delay between retries in milliseconds (default: `1000`)                         | <Badge type="info" text="v0.5+" /> |
| `retry.backoff`   | String  | N        | Backoff strategy: `fixed`, `linear`, `exponential` (default: `fixed`)           | <Badge type="info" text="v0.5+" /> |
| `retry.max-delay` | Integer | N        | Maximum delay for exponential/linear backoff in milliseconds (default: `30000`) | <Badge type="info" text="v0.5+" /> |
| `retry.then`      | String  | N        | Fallback strategy after retries: `throw`, `sink`, or `skip` (default: `throw`)  | <Badge type="info" text="v0.5+" /> |
| `sink.*`          | Varies  | N        | Sink configuration (required when `retry.then: sink`)                           | <Badge type="info" text="v0.5+" /> |

**Example:**

```yaml
on-error:
  strategy: retry
  scope: step
  retry:
    attempts: 5
    delay: 2000
    backoff: exponential
    max-delay: 60000
    then: sink
  sink:
    schema: errors
    entity: retry_failures
```

## Error Scopes

The `scope` parameter determines whether error handling applies to the entire step or individual rows:

### Choosing the Right Scope

```mermaid
flowchart TD
    A[What type of operation?] --> B{Data Access/Transfer?}
    A --> C{Data Transformation?}

    B --> D[select, insert, update, delete<br/>run, sync]
    C --> E[map, transform<br/>validation operations]

    D --> F[Use 'step' scope]
    E --> G[Use 'row' scope]

    F --> H[Entire operation fails<br/>Retry whole step]
    G --> I[Individual rows fail<br/>Continue with good rows]

    H --> J[Strategies: throw, retry]
    I --> K[Strategies: skip, sink, retry]
```

**Use `step` scope when:**

- Performing data access operations (select, insert, update, delete)
- Running external operations (AI engines, sync)
- Connection or infrastructure failures affect the entire operation
- You need to retry the complete operation

**Use `row` scope when:**

- Transforming or validating individual data rows
- Data quality issues affect only some rows
- You want to continue processing valid rows
- You need to capture specific problematic rows for analysis

### `step` Scope

Error handling applies to the entire step operation. If the step fails, the whole step is retried/failed.

**Default for:** `select`, `insert`, `update`, `delete`, `run`, `sync`

**Behavior:**

- Connection errors → Entire step fails
- Invalid SQL → Entire step fails
- Missing table → Entire step fails
- Retry applies to whole step operation

**Strategy Compatibility:**
| Strategy | Compatible with Step Scope | Reason |
| -------- | -------------------------- | --------------------------------------------------- |
| `throw` | ✅ Yes | Stops execution on step failure |
| `skip` | ❌ No | Skipping entire step doesn't make sense |
| `sink` | ❌ No | Sinking entire step data is not practical |
| `retry` | ✅ Yes | Retries failed step, then applies fallback strategy |

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
| -------- | ------------------------- | --------------------------------------------------- |
| `throw` | ❌ No | Would stop processing all rows |
| `skip` | ✅ Yes | Skips failed rows, continues processing |
| `sink` | ✅ Yes | Sinks failed rows, continues processing |
| `retry` | ✅ Yes | Retries failed rows, then applies fallback strategy |

## Error Context Variables

When errors occur, the following context variables are available for error handling:

| Variable           | Description               | Available In                          |
| ------------------ | ------------------------- | ------------------------------------- |
| `$error.message`   | Error message text        | All strategies and scopes             |
| `$error.type`      | Error type/classification | All strategies and scopes             |
| `$error.step`      | Step that failed          | All strategies and scopes             |
| `$error.timestamp` | When error occurred       | All strategies and scopes             |
| `$error.attempt`   | Current retry attempt     | Retry strategies (step and row scope) |

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

### Step Scope vs Row Scope Comparison

#### Step Scope Example (Data Access)

```yaml
plans:
  data-pipeline:
    customers:
      steps:
        - select:
            schema: source
            entity: customers
            on-error:
              strategy: retry
              retry:
                attempts: 3
                delay: 1000
                then: throw

        # If database connection fails, entire select operation
        # is retried 3 times, then execution stops
```

#### Row Scope Example (Data Transformation)

```yaml
plans:
  data-pipeline:
    customers:
      steps:
        - map:
            script: |
              $row.email = $row.email.toLowerCase().trim();
              if (!$row.email.includes('@')) {
                throw new Error('Invalid email format');
              }
              return $row;
            on-error:
              strategy: sink
              scope: row # Default for map
              sink:
                schema: errors
                entity: invalid_emails

        # Individual rows with invalid emails are sunk,
        # valid rows continue processing
```

### Basic Error Handling

```yaml
plans:
  data-pipeline:
    raw-data:
      steps:
        - select:
            schema: source
            entity: raw_data
            on-error:
              strategy: skip

        - map:
            script: |
              $row.processed_at = new Date().toISOString();
              return $row;
            on-error:
              strategy: sink
              sink:
                schema: errors
                entity: map_failures

        - insert:
            schema: target
            entity: processed_data
            on-error:
              strategy: retry
              retry:
                attempts: 3
                delay: 1000
                then: throw
```

### Advanced Error Handling with Retry and Sink

```yaml
plans:
  critical-pipeline:
    data:
      steps:
        - select:
            schema: external_api
            entity: data
            on-error:
              strategy: retry
              retry:
                attempts: 5
                delay: 2000
                backoff: exponential
                max-delay: 60000
                then: sink
              sink:
                schema: errors
                entity: api_failures
                include-error: true

        - map:
            script: |
              $row.normalized = $row.value.toLowerCase().trim();
              return $row;
            on-error:
              strategy: skip
```
