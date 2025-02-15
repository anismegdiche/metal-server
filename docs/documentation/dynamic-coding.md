# Dynamic Coding

## Dynamic JS

By seamlessly integrating dynamic JS code, Metal empowers users to create more versatile and adaptive configurations.
To embed JS code within your key values, encapsulate it like this:

```javascript
${{ /* JS code here */ }}
```

### Usage

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

### Context variables⚡

Context variables are placeholders that can be used within your dynamic JS code. They are denoted by the `$` character, followed by the variable name.

#### `$schema`⚡ <Badge type="info" text="^0.4" />

The name of the schema being queried.

#### `$entity`⚡ <Badge type="info" text="^0.4" />

The name of the entity being queried.

#### `$request`⚡ <Badge type="info" text="^0.4" />

The current request being processed (exclusive to web services data providers), containing the following properties:

| Property    | Type   | Description                           |
| ----------- | ------ | ------------------------------------- |
| `method`    | string | The HTTP method used.                 |
| `url`       | string | The URL of the request.               |
| `headers`   | object | The request headers.                  |
| `body`      | object | The request body.                     |
| `data-path` | String | Path of json data to find in response |

#### `$response`⚡ <Badge type="info" text="^0.4" />

The response object for web services (exclusive to web services data providers), containing the following properties:

| Property | Type   | Description            |
| -------- | ------ | ---------------------- |
| `url`    | String | Requested URL          |
| `host`   | String | Requested host         |
| `body`   | Object | Returned response body |

#### `$row`⚡ <Badge type="info" text="^0.4" />

The current row being processed (exclusive to web services data providers).
These object contains returned fields of the row


## ❇️ Field Value Escape (update data only) ⚡ <Badge type="info" text="^0.4" />

To escape a field value and treat it as an expression, prefix it with `$>`. This is particularly useful when an update relies on existing fields.
You can also mix Dynamic JS and field value escape.

**Example**:

```yaml
plans:
  my-plan:
    my-entity:
      - update:
          filter-expression: "id < 10"
          data:
            display_name: $> first_name + ' ' + last_name # <-- escape field value
            unique_id: $>  last_name + '-' + ${{ $utils.Uuid() }}  # <-- mixed usage
```