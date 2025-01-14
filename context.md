# Context

| Variable      | Property                         | Description                           |
| ------------- | -------------------------------- | ------------------------------------- |
| $entity       | -                                | Requested entity                      |
| $schema       | -                                | Requested schema                      |
| ---------     | -------------------------------  | ------------------------------------- |
| $request      | data-path                        | Path of json data to find in response |
| ---------     | -------------------------------  | ------------------------------------- |
| $response     | body                             | Returned reponse body                 |
| ---------     | -------------------------------  | ------------------------------------- |
| $item or $row | (depends on item/row properties) | Represent a single row                |

# Config File

| Config path                                           | Available context |
| ----------------------------------------------------- | ----------------- |
| `sources.*.options.endpoints.item.*.*.request`        | `$item`           |
| `sources.*.options.endpoints.item.*.*.response`       | `$request`        |
| `sources.*.options.endpoints.*.*.*.session-headers.*` | `$response`       |
| `sources.*.options.json-path`                         |                   |

# API Call

| option              | Available context   |
| ------------------- | ------------------- |
| `filter`            |                     |
| `filter-expression` | `$item`             |
| `data`              | `$entity`,`$schema` |
