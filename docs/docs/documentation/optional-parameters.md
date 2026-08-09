# Optional Parameters

These parameters provide a flexible way to modify API requests or plan commands. Use them to apply filters, specify sorting options, or include additional data as needed. Their function remains consistent across both API requests and plan commands.

All parameters are described in the table below:

| Parameter             | Usage                                | GET<br>select | POST<br>insert | PATCH<br>update | DELETE<br>delete | JS Context                                                                                   | Metal version                         |
| --------------------- | ------------------------------------ | :-----------: | :------------: | :-------------: | :--------------: | -------------------------------------------------------------------------------------------- | ------------------------------------- |
| 📜`filter`            | simple filter                        |      🟢       |       -        |       🟢        |        🟢        | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="default" text="v0.4+" /> |
| 📜`filter-expression` | complex filter expression            |      🟢       |       -        |       🟢        |        🟢        | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="default" text="v0.4+" /> |
| 📜`fields`            | select fields to return              |      🟢       |       -        |        -        |        -         | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="default" text="v0.4+" /> |
| 📜`sort`              | sort data with a given order         |      🟢       |       -        |        -        |        -         | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="default" text="v0.4+" /> |
| 📜`limit`             | limit the number of rows returned    |      🟢       |       -        |        -        |        -         | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="v0.5+" />    |
| 📜`offset`            | number of rows to skip               |      🟢       |       -        |        -        |        -         | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="v0.5+" />    |
| `cache`               | cache returned data for a given time |      🟢       |       -        |        -        |        -         | N/A                                                                                          | <Badge type="default" text="v0.1+" /> |
| 📜❇️`data`            | data to send to provider             |       -       |       🟢       |       🟢        |        -         | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="default" text="v0.4+" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))
>
> ❇️: Supports Field Escape Engine (see: [Field Escape Engine](dynamic-expression-engine#field-escape-engine))

## How Optional Parameters are handled by Data Providers

| Data Provider                           | `data` | `filter` | `filter-expression` | `fields` | `sort` | `limit` | `offset` | `cache` |
| --------------------------------------- | :----: | :------: | :-----------------: | :------: | :----: | :-----: | :------: | :-----: |
| Azure SQL Database/<br/>Microsoft SQL Server |   🔵   |    🔵    |         🔵          |    🔵    |   🔵   |   🔵    |    🔵    |   🟢    |
| Storage                                 |   🟢   |    🟢    |         🟢          |    🟢    |   🟢   |   🟢    |    🟢    |   🟢    |
| Memory                                  |   🟢   |    🟢    |         🟢          |    🟢    |   🟢   |   🟢    |    🟢    |   🟢    |
| Metal Server                            |   🔵   |    🔵    |         🔵          |    🔵    |   🔵   |   🔵    |    🔵    |   🔵    |
| MongoDB                                 |   🔵   |    🔵    |         🔵          |    🔵    |   🔵   |   🔵    |    🔵    |   🟢    |
| MySql                                   |   🔵   |    🔵    |         🔵          |    🔵    |   🔵   |   🔵    |    🔵    |   🟢    |
| Plans                                   |   -    |    🟢    |         🟢          |    🟢    |   🟢   |   🟢    |    🟢    |   🟢    |
| PostgreSQL                              |   🔵   |    🔵    |         🔵          |    🔵    |   🔵   |   🔵    |    🔵    |   🟢    |
| WebService                              |   🟡   |    🟢    |         🟢          |    🟢    |   🟢   |   🟢    |    🟢    |   🟢    |
| Cosmos DB                               |   🔵   |    🔵    |         🔵          |    🔵    |   🔵   |   🔵    |    🔵    |   🟢    |

> 🔵 Handled natively by the data provider driver
>
> 🟡 Partially handled by the data provider driver
>
> 🟢 Handled by Metal Server

## Parameters

### `filter`

Simple filtering feature by providing fields and values.

Supports [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine).

**Example:**

> To filter people with `name = John` and `location = USA`:
>
> **GET Request**
>
> ```http
> GET /schema/my-schema/my-entity
>     ?filter={"Name":"John","Location":"USA"}
> ```
>
> **PATCH Request**
>
> ```http
> PATCH /schema/my-schema/my-entity
> Content-Type: application/json
>
> {
> 	"filter": {
> 		"Name": "John",
> 		"Location": "USA"
> 	}
> }
> ```
>
> **DELETE Request**
>
> ```http
> DELETE /schema/my-schema/my-entity
> Content-Type: application/json
>
> {
> 	"filter": {
> 		"Name": "John",
> 		"Location": "USA"
> 	}
> }
> ```

### `filter-expression`

Free expression for more complex data filtering expressed in SQL-like syntax.

Supports [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine).

**Example:**

> **GET Request**
>
> ```http
> GET /schema/my-schema/my-entity
>     ?filter-expression=name LIKE '%%ing'
> ```
>
> **PATCH Request**
>
> ```http
> PATCH /schema/my-schema/my-entity
> Content-Type: application/json
>
> {
> 	"filter-expression": "name LIKE '%ing' "
> }
> ```
>
> **DELETE Request**
>
> ```http
> DELETE /schema/my-schema/my-entity
> Content-Type: application/json
>
> {
> 	"filter-expression": "name LIKE '%ing' "
> }
> ```

::: tip ℹ️ NOTE
When employing the `LIKE` operator with the wildcard `%` in a GET method, remember to escape it using double `%%`.

**Example:**
```
filter-expression=name LIKE '%%ing'
```

:::

### `fields`

Select fields to return.

Supports [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine).

**Example:**

> ```http
> GET /schema/my-schema/my-entity?fields="name, country"
> ```

### `sort`

sort data with given order.

Supports [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine).

| Sorting Operator | Usage            | SQL like |
| ---------------- | ---------------- | -------- |
| `asc`            | Ascending order  | ASC      |
| `desc`           | Descending order | DESC     |

**Example:**

> To sort data with `name` ascending then `email` descending:
>
> ```http
> GET /schema/my-schema/my-entity
>     ?sort={"name": "asc","email": "desc"}
> ```

### `limit`

Limit the maximum number of rows returned by a select request.

Supports [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine).

Must be a positive integer.

**Example:**

> To return only the first 10 rows:
>
> ```http
> GET /schema/my-schema/my-entity?limit=10
> ```

### `offset`

Skip the given number of rows before returning results. Combine it with `limit` to paginate through large datasets.

Supports [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine).

Must be a non-negative integer.

**Example:**

> To return rows 11 to 20:
>
> ```http
> GET /schema/my-schema/my-entity?limit=10&offset=10
> ```

::: tip ℹ️ NOTE
When `limit` is combined with `sort` and/or `filter`, the offset is applied **after** sorting and filtering.
:::

### `cache`

Instruct Metal to cache the data returned from the source for a given time in seconds before displaying it to the user end point, meanwhile users that hit again the same query will receive the cached data until it expires.

**Example:**

> To cache returned data for 60 seconds:
>
> ```http
> GET /schema/my-schema/my-entity?cache=60
> ```

### `data`

This paramater is used for inserting or updating data.

Supports [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine) and Field Escape Engine only for updates (see: [Field Escape Engine](dynamic-expression-engine#field-escape-engine))

* **<u>Inserting data:</u>**

`:data` accept whether a JSON object if it is a single row to insert or a JSON Array if many rows

**Example: single row insert**

> **Request**
>
> ```http
> POST /schema/my-schema/my-entity
> Content-Type: application/json
>
> {
> 	"data":
> 	{
> 		"name":"Facebook",
> 		"color": "blue"
> 	}
> }
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 201 Created
> ```

**Example: multiple rows insert**

> **Request**
>
> ```http
> POST /schema/my-schema/my-entity
> Content-Type: application/json
>
> {
> 	"data": [
> 		{ "name":"Facebook", "color": "blue" },
> 		{ "name":"YouTube",  "color": "red"  }
> 	]
> }
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 201 Created
> ```

* **<u> Updating data</u>**

`:data` accept a JSON object of `key:value` where `key` is the field to modify and `value` is the new value

**Example:**

> **Request**
>
> ```http
> PATCH /schema/my-schema/my-entity
> Content-Type: application/json
>
> {
> 	"data":
> 	{
> 		"name":"Facebook",
> 		"color": "blue"
> 	}
> }
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 204 No Content
> ```
