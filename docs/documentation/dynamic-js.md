# Dynamic JS code

By seamlessly integrating dynamic JS code, Metal empowers users to create more versatile and adaptive configurations.
To embed JS code within your key values, encapsulate it like this:

```javascript
${{ /* JS code here */ }}
```

## Usage

**Example: Filtering Dates Before Now**

Consider the following example, where dynamic JS code is applied to filter dates before the current date:

```http
POST /schema/my-schema/my-entity
Content-Type: application/json

{
	"filter-expression": "date < '${{ new Date().toLocaleDateString(\"en-US\") }}'"
}

```

In this instance, the `filter-expression` incorporates JS code within the curly braces to dynamically calculate the current date in the specified format.

This flexibility enables precise control and customization, showcasing the versatility that dynamic JS code brings to your Metal implementation.

## Context

| Variable  | Properties                      | Description                                                             |
| --------- | ------------------------------- | ----------------------------------------------------------------------- |
| $entity   | -                               | Requested entity                                                        |
| $schema   | -                               | Requested schema                                                        |
| --------- | ------------------------------- | -------------------------------------                                   |
| $request  | data-path                       | Path of json data to find in response                                   |
| --------- | ------------------------------- | -------------------------------------                                   |
| $response | body                            | Returned reponse body                                                   |
| --------- | ------------------------------- | -------------------------------------                                   |
| $row      | (depends on row fields)         | Represents a single unit of data (e.g., a row, document, or file entry) |

### Config File

| Config path                                           | Available context |
| ----------------------------------------------------- | ----------------- |
| `sources.*.options.endpoints.item.*.*.request`        | `$row`           |
| `sources.*.options.endpoints.item.*.*.response`       | `$request`        |
| `sources.*.options.endpoints.*.*.*.session-headers.*` | `$response`       |
| `sources.*.options.json-path`                         |                   |

### API Call

| option              | Available context   |
| ------------------- | ------------------- |
| `filter`            |                     |
| `filter-expression` | `$row`             |
| `data`              | `$entity`,`$schema` |
