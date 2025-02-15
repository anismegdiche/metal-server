# Optional Parameters

Optional Parameters are usefull for applying filtering, sorting or limit fields to return.
They are the same whether they are used as query string for a `GET` Request or in the body for `POST`,`PATCH` and `DELETE` or in the plan commands `select`,`delete`,`insert` and `update`.

All parameters are described in the table below:

| Parameter             | Usage                                | GET<br>select | POST<br>insert | PATCH<br>update | DELETE<br>delete | JS Context          | Metal version                     |
| --------------------- | ------------------------------------ | :-----------: | :------------: | :-------------: | :--------------: | ------------------- | --------------------------------- |
| ✨`cache`             | cache returned data for a given time |      🟢       |       -        |        -        |        -         | `$schema`,`$entity` | <Badge type="info" text="^0.4" /> |
| ✨`data`              | data to send to provider             |       -       |       🟢       |       🟢        |        -         | `$schema`,`$entity` | <Badge type="info" text="^0.4" /> |
| ✨`fields`            | select fields to return              |      🟢       |       -        |        -        |        -         | `$schema`,`$entity` | <Badge type="info" text="^0.4" /> |
| ✨`filter`            | simple filter                        |      🟢       |       -        |       🟢        |        🟢        | `$schema`,`$entity` | <Badge type="info" text="^0.4" /> |
| ✨`filter-expression` | complex filter expression            |      🟢       |       -        |       🟢        |        🟢        | `$schema`,`$entity` | <Badge type="info" text="^0.4" /> |
| ✨`sort`              | sort data with a given order         |      🟢       |       -        |        -        |        -         | `$schema`,`$entity` | <Badge type="info" text="^0.4" /> |

> ✨ Supports Dynamic JS Code (see: [Dynamic JS Code](dynamic-js))

## How Optional Parameters are handled by Data Providers{.new-feature}

| Data Provider                           | `data` | `filter` | `filter-expression` | `fields` | `sort` | `cache` |
| --------------------------------------- | :----: | :------: | :-----------------: | :------: | :----: | :-----: |
| Azure SQL Database/Microsoft SQL Server |   🔵   |    🔵    |         🔵          |    🔵    |   🔵   |   🟢    |
| Files                                   |   🟢   |    🟢    |         🟢          |    🟢    |   🟢   |   🟢    |
| Memory                                  |   🟢   |    🟢    |         🟢          |    🟢    |   🟢   |   🟢    |
| Metal Server                            |   🔵   |    🔵    |         🔵          |    🔵    |   🔵   |   🔵    |
| MongoDB                                 |   🔵   |    🔵    |         🔵          |    🔵    |   🔵   |   🟢    |
| MySql                                   |   🔵   |    🔵    |         🔵          |    🔵    |   🔵   |   🟢    |
| Plan                                    |   -    |    🟢    |         🟢          |    🟢    |   🟢   |   🟢    |
| PostgreSQL                              |   🔵   |    🔵    |         🔵          |    🔵    |   🔵   |   🟢    |
| WebService                              |   🟡   |    🟢    |         🟢          |    🟢    |   🟢   |   🟢    |

> 🔵 Handled natively by the data provider driver
>
> 🟡 Partially handled by the data provider driver
>
> 🟢 Handled by Metal Server

## Parameters

### `filter`

Simple filtering feature by providing fields and values:

**Example**

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

::: tip ℹ️ TIP
It is possible to use dynamic JS code in values.

For more information, please refer to [Dynamic JS code](dynamic-js)
:::

### `filter-expression`

Free expression for more complex data filtering expressed in SQL-like syntax.

**Example**

> **GET Request**
>
> ```http
> GET /schema/my-schema/my-entity
>     ?filter-expression="name LIKE '%ing' "
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

> **Example:**
>
> ```
> filter-expression=name LIKE '%%ing'
> ```
>
> :::

::: tip ℹ️ TIP
It is possible to use dynamic JS code in values.

For more information, please refer to [Dynamic JS code](dynamic-js)
:::

### `fields`

Select fields to return

**Example**

> ```http
> GET /schema/my-schema/my-entity
>     ?fields="name, country"
> ```

### `sort`

sort data with given order.

| Sorting Operator | Usage            | SQL like |
| ---------------- | ---------------- | -------- |
| `asc`            | Ascending order  | ASC      |
| `desc`           | Descending order | DESC     |

**Example**

> To sort data with `name` ascending then `email` descending:
>
> ```http
> GET /schema/my-schema/my-entity
>     ?sort={"name":"asc","email":"desc"}
> ```

### `cache`

Instruct Metal to cache the data returned from the source for a given time in seconds before displaying it to the user end point, meanwhile users that hit again the same query will receive the cached data until it expires.

**Example**

> To cache returned data for 60 seconds:
>
> ```http
> GET /schema/my-schema/my-entity
>     ?cache=60
> ```

### `data`

this paramater is used for inserting or updating data.

#### Inserting data

`:data` accept whether a JSON object if it is a single row to insert or a JSON Array if many rows

::: tip ℹ️ TIP
It is possible to use dynamic JS code in values.

For more information, please refer to [Dynamic JS code](dynamic-js)
:::

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

#### Updating data

`:data` accept a JSON object of `key:value` where `key` is the field to modify and `value` is the new value

**Example**

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
