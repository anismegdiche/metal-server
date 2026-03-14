# Dynamic Expression Engine

## JavaScript Expression Engine

By seamlessly integrating JavaScript code, Metal empowers users to create more versatile and adaptive configurations.
To embed JS code within your key values, encapsulate it like this:

```javascript
${{ /* JS code here */ }}
```

### Usage

**Example: Filtering Dates Before Now**

Consider the following example, where JS code is applied to filter dates before the current date:

```http
POST /schema/my-schema/my-entity
Content-Type: application/json

{
	"filter-expression": "date < '${{ new Date().toLocaleDateString(\"en-US\") }}'"
}

```

In this instance, the `filter-expression` incorporates JS code within the curly braces to dynamically calculate the current date in the specified format.

This flexibility enables precise control and customization, showcasing the versatility that JS Expression Engine brings to your Metal implementation.

### Context variables

Context variables are placeholders that can be used within your JavaScript Expression Engine. They are denoted by the `$` character, followed by the variable name.

Their availability depends on the command and plan usage, and can be used to access specific information or functionality.

#### `$schema` <Badge type="default" text="v0.4+" />

The name of the schema being queried.

#### `$entity` <Badge type="default" text="v0.4+" />

The name of the entity being queried.

#### `$request` <Badge type="default" text="v0.4+" />

The current request being processed (exclusive to web services data providers), containing the following properties:

| Property    | Type   | Description                           |
| ----------- | ------ | ------------------------------------- |
| `method`    | string | The HTTP method used.                 |
| `url`       | string | The URL of the request.               |
| `headers`   | object | The request headers.                  |
| `body`      | object | The request body.                     |
| `data-path` | String | Path of json data to find in response |

#### `$response` <Badge type="default" text="v0.4+" />

The response object for web services (exclusive to web services data providers), containing the following properties:

| Property | Type   | Description            |
| -------- | ------ | ---------------------- |
| `url`    | String | Requested URL          |
| `host`   | String | Requested host         |
| `body`   | Object | Returned response body |

#### `$row` <Badge type="default" text="v0.4+" />

The current row being processed (exclusive to web services data providers).
These object contains returned fields of the row

#### `$result` <Badge type="info" text="v0.5+" />

The result of the AI Engine processing. (see: [AI Engines](ai-engines))

#### `$vars` <Badge type="info" text="v0.5+" />

An object containing persistent variables set using the `set-var` step in a plan. These variables are available across different steps and entities within the same plan execution context.

#### `$utils` <Badge type="default" text="v0.4+" />

The `$utils` object, containing various utility functions and methods, including data manipulation, string operations, and more.

Implemented Utils:
| variable | description |
| -------- | ----------- |
| `$utils._` | lodash utility functions |
| `$utils.JSON` | JSON utility functions |
| `$utils.Math` | Math utility functions |
| `$utils.newUuid()` | generates a new UUID |

## Field Escape Engine <Badge type="default" text="v0.4+" />

To escape a field value and treat it as an expression, prefix it with `$>`. This is particularly useful when an update relies on existing fields.
You can also mix JavaScript Expression Engine and field value escape.

**Example**:

```yaml
plans:
  my-plan:
    my-entity:
      steps:
        - update:
            filter-expression: "id < 10"
            data:
              display_name: $> first_name + ' ' + last_name # <-- escape field value
              unique_id: $>  last_name + '-${{ $utils.newUuid() }}' # <-- mixed usage
```

::: tip ℹ️ NOTE
This funtionnality is only available for data updates such as Metal REST API `PATCH` or plan `update` command.
:::
