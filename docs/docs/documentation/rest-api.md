---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

# Metal REST API

Metal offers a REST API specifically crafted to execute a range of functions:

- Conducting CRUD operations (including select, update, delete, insert)
- Facilitating data transformation
- Implementing a data caching mechanism for a specified duration

## Endpoints


| Endpoint Starting | Usage              | Metal version                         |
| ----------------- | ------------------ | ------------------------------------- |
| `/user/`…         | User operations    | <Badge type="default" text="v0.1+" /> |
| `/schema/`…       | Schemas operations | <Badge type="default" text="v0.1+" /> |

For the MCP endpoint, see [Metal MCP Server](mcp-server).

### `/user/`…

This endpoint serves as the entry point for User operations.
The table below describes available endpoints and methods to use for request :

| Endpoint       | Method | Usage                                         | Metal version                         |
| -------------- | ------ | --------------------------------------------- | ------------------------------------- |
| `/user/login`  | POST   | Authenticate a Metal user                     | <Badge type="default" text="v0.1+" /> |
| `/user/logout` | POST   | Log out current Metal user                    | <Badge type="default" text="v0.1+" /> |
| `/user/info`   | GET    | Get informations about the current Metal user | <Badge type="default" text="v0.1+" /> |

---

#### `/user/login`

The login endpoint is used to authenticate a user in the Metal system.

Metal has its own user authentication mechanism that is separate from the credentials provided by data providers.

To enable user authentication in Metal, you need to configure [`server.authentication`](config-yml#authentication) in the configuration file.

For more information about authentication, see [Understanding Authentication, Users, and Roles in Metal Server](../guides/authentication)

**Endpoint**

> **POST** /user/login

**Body Parameters**

| Name     | Type   | Requried | Description   |
| -------- | ------ | -------- | ------------- |
| username | string | Y        | User name     |
| password | string | Y        | User password |

**Example:**

> **Request**
>
> ```http
> POST  http://127.0.0.1:3000/user/login
> Content-Type: application/json
>
> {
>     "username":"admin",
>     "password": "123456"
> }
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 200 OK
> Content-Type: application/json; charset=utf-8
>
> {
>   "token": "<token>"
> }
> ```

**Response Errors**

| HTTP Code | Message                      |
| --------- | ---------------------------- |
| 400       | Bad Request                  |
| 401       | Invalid username or password |
| 500       | Something Went Wrong         |

---

#### `/user/logout`

The logout functionality allows the current logged-in Metal user to end their session.

When a user logs out, it terminates their current session and invalidates the associated authentication token.

**Endpoint**

> **POST** /user/logout

**Example:**

> **Request**
>
> ```http
> POST  http://127.0.0.1:3000/user/logout
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 204 No Content
> ```

**Response Errors**

| HTTP Code | Message                      |
| --------- | ---------------------------- |
| 400       | Bad Request                  |
| 401       | Invalid username or password |
| 500       | Something Went Wrong         |

---

#### `/user/info`

This feature provides access to detailed information about the currently logged-in user in the Metal system.

**Endpoint**

> **GET** /user/info

**Example:**

> **Request**
>
> ```http
> GET  http://127.0.0.1:3000/user/info
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 200 OK
> Content-Type: application/json; charset=utf-8
>
> {
>   "username": "myuser"
> }
> ```

**Response Errors**

| HTTP Code | Message                      |
| --------- | ---------------------------- |
| 400       | Bad Request                  |
| 401       | Invalid username or password |
| 403       | Forbidden                    |
| 500       | Something Went Wrong         |

---

### `/schema`/…

This endpoint serves as the entry point for Entities operations.
The table below describes available endpoints and methods to use for request :

| Endpoint                              | Method                   | Usage                                                                                     | Metal version                         |
| ------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------- |
| `/schema`/**`:schema`**               | GET                      | Lists entities in the `:schema`                                                           | <Badge type="default" text="v0.3+" /> |
| `/schema`/**`:schema`**/**`:entity`** | GET, POST, PATCH, DELETE | Performs CRUD operations for one or many items in the `:entity` existing in the `:schema` | <Badge type="default" text="v0.1+" /> |

#### `/schema/:schema`

| HTTP Method | Usage                                  |
| ----------- | -------------------------------------- |
| GET         | Returns list of entities in the schema |

###### GET

Returns list of the entities of the schema provided in URL parameters.

**Endpoint**

<span style="font-family: 'Fira Mono', monospace;">

> **GET** /schema/**`:schema`**

</span>

**Path Parameters**

| Name      | type   | Required | Description                 |
| --------- | ------ | -------- | --------------------------- |
| `:schema` | string | Y        | name of the selected schema |

**Response**

See [Response Objects](#response-objects)

**Example:**

> To list all entities from the schema `my-schema`:
>
> **Request**
>
> ```http
> GET http://127.0.0.1:3000/schema/my-schema
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 200 OK
> Content-Type: application/json
>
> {
>   "schema": "my-schema",
>   "status": 200,
>   "metadata": {},
>   "fields": {
>     "name": "string",
>     "type": "string"
>   },
>   "rows": [
>     {
>       "name": "my-entity1",
>       "type": "table"
>     },
>     {
>       "name": "my-entity2",
>       "type": "table"
>     }
>   ]
> }
> ```

**Response Errors**

| HTTP Code | Message                      |
| --------- | ---------------------------- |
| 400       | Bad Request                  |
| 401       | Invalid username or password |
| 403       | Forbidden                    |
| 404       | Not found                    |
| 500       | Something Went Wrong         |

---

#### `/schema/:schema/:entity`

| HTTP Method | Usage                     |
| ----------- | ------------------------- |
| GET         | Return data of the entity |
| POST        | Insert data in the entity |
| PATCH       | Update data in the entity |
| DELETE      | Delete data in the entity |

###### GET

Returns data from the entity of the schema provided in URL parameters. By default, `select` return all available data in the entity :

**Endpoint**

<span style="font-family: 'Fira Mono', monospace;">

> **GET** /schema/**`:schema`**/**`:entity`**

</span>

**Path Parameters**

| Name      | type   | Required | Description                               |
| --------- | ------ | -------- | ----------------------------------------- |
| `:schema` | string | Y        | name of the selected schema               |
| `:entity` | string | Y        | name of the entity in the selected schema |

**Query Parameters**

| Name                 | type        | Required | Description                                                                             | Metal version                         |
| -------------------- | ----------- | -------- | --------------------------------------------------------------------------------------- | ------------------------------------- |
| `:fields`            | string      | N        | fields to keep, comma seperated. (see: [Optional Parameters](optional-parameters))      | <Badge type="default" text="v0.1+" /> |
| `:filter`            | JSON object | N        | condition `key:value` to filter data. (see: [Optional Parameters](optional-parameters)) | <Badge type="default" text="v0.1+" /> |
| `:filter-expression` | string      | N        | free form condition to filter data. (see: [Optional Parameters](optional-parameters))   | <Badge type="default" text="v0.1+" /> |
| `:sort`              | string      | N        | sort data, can be `asc` or `desc`. (see: [Optional Parameters](optional-parameters))    | <Badge type="default" text="v0.1+" /> |
| `:limit`             | number      | N        | maximum number of rows to return. (see: [Optional Parameters](optional-parameters))     | <Badge type="info" text="v0.5+" />    |
| `:offset`            | number      | N        | number of rows to skip. (see: [Optional Parameters](optional-parameters))               | <Badge type="info" text="v0.5+" />    |
| `:cache`             | number      | N        | time in seconds to cache data. (see: [Optional Parameters](optional-parameters))        | <Badge type="default" text="v0.1+" /> |


**Response**

See [Response Objects](#response-objects)


::: tip ℹ️ NOTE
For detailed description of `fields`, `filter`, `filter-expression`, `sort`, `limit`, `offset`, `cache` usage, please refer to [Optional Parameters](#optional-parameters)
:::

**Examples**

To select all datas from the schema `my-schema` and the entity `my-entity` where `color = red`:
 
> ```http
> GET http://127.0.0.1:3000/schema/my-schema/my-entity?filter={color:"red"}
> ```
 
To select the second page of 10 rows from the schema `my-schema` and the entity `my-entity`:

> ```http
> GET http://127.0.0.1:3000/schema/my-schema/my-entity?limit=10&offset=10
> ```

**Response Errors**

| HTTP Code | Message                      |
| --------- | ---------------------------- |
| 400       | Bad Request                  |
| 401       | Invalid username or password |
| 403       | Forbidden                    |
| 404       | Not found                    |
| 500       | Something Went Wrong         |

---

###### POST

Insert one or more objects in the entity of the schema provided in URL parameters:

**Endpoint**

<span style="font-family: 'Fira Mono', monospace;">

> **POST** /schema/**`:schema`**/**`:entity`** <br>
> Content-Type: application/json <br>
> { <br>
>     `"data"` : **`:data`** <br>
> }


</span>

**Parameters**

| Name      | type       | Required | Description                                                                             |
| --------- | ---------- | -------- | --------------------------------------------------------------------------------------- |
| `:schema` | string     | Y        | name of schema                                                                          |
| `:entity` | string     | Y        | name of entity in the `:schema`                                                         |
| `:data`   | JSON array | Y        | data to be inserted in the `:entity`. (see: [Optional Parameters](optional-parameters)) |

::: tip ℹ️ NOTE
For detailed description of `data` usage, please refer to [Optional Parameters](#optional-parameters)
:::

**Example:**

> To insert the data below in the schema `my-schema` and the entity `my-entity`:
>
> | name     | color |
> | -------- | ----- |
> | Facebook | blue  |
> | YouTube  | red   |
>
> **Request**
>
> ```http
> POST http://127.0.0.1:3000/schema/my-schema/my-entity
> Content-Type: application/json
>
> {
> 	"data": [
> 		{  "name":"Facebook",	"color": "blue"	},
> 		{  "name":"YouTube",	"color": "red"	}
> 	]
> }
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 201 Created
> ```

**Response Errors**

| HTTP Code | Message                      |
| --------- | ---------------------------- |
| 400       | Bad Request                  |
| 401       | Invalid username or password |
| 403       | Forbidden                    |
| 404       | Not found                    |
| 500       | Something Went Wrong         |

---

###### PATCH

Modify data in the entity of the schema provided in URL parameters.

::: danger 🛑 BE CAREFULL
If no filtering is supplied in the body with `filter` or `filter-expression`, ALL DATA IN THE ENTITY WILL BE MODIFIED !
:::

**Endpoint**

<span style="font-family: 'Fira Mono', monospace;">

> **PATCH** /schema/**`:schema`**/**`:entity`** <br>
> Content-Type: application/json <br>
> { <br>
>     "filter" : **`:filter`** <br>
>     "filter-expression" : **`:filter-expression`** <br>
>     "data" : **`:data`** <br>
> }

</span>

**Parameters**

| Name                 | Type        | Required | Description                                                                                                            |
| -------------------- | ----------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `:schema`            | String      | Y        | The name of the selected schema.                                                                                       |
| `:entity`            | String      | Y        | The name of the entity in the selected schema.                                                                         |
| `:filter`            | JSON Object | N        | A condition in the format `field:value` to filter data. (see: [Optional Parameters](optional-parameters))              |
| `:filter-expression` | String      | N        | A free-form condition to filter data. (see: [Optional Parameters](optional-parameters))                                |
| `:data`              | JSON Object | Y        | JSON data in the format `field:newvalue` to modify in the `:entity`. (see: [Optional Parameters](optional-parameters)) |

::: tip ℹ️ NOTE
For detailed description of `data`, `filter` and `filter-expression` usage, please refer to [Optional Parameters](#optional-parameters)
:::

**Example:**

> To modify `status = disabled` in the entity `my-entity` of the schema `my-schema` where `color = red`:
>
> **Request**
>
> ```http
> PATCH http://127.0.0.1:3000/schema/my-schema/my-entity
> Content-Type: application/json
>
> {
> 	"filter": {
> 		"color": "red"
> 	},
> 	"data": {
> 		"status": "disabled"
> 	}
> }
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 204 No Content
> ```

**Response Errors**

| HTTP Code | Message                      |
| --------- | ---------------------------- |
| 400       | Bad Request                  |
| 401       | Invalid username or password |
| 403       | Forbidden                    |
| 404       | Not found                    |
| 500       | Something Went Wrong         |

---

###### DELETE

Deletes data from the entity in the schema provided in URL parameters.

::: danger 🛑 BE CAREFULL
If no filtering is supplied in the body with `filter` or `filter-expression`, ALL DATA IN THE ENTITY WILL BE DELETED !
:::

**Endpoint**

<span style="font-family: 'Fira Mono', monospace;">

> **DELETE** /schema/**`:schema`**/**`:entity`** <br>
> Content-Type: application/json <br>
> { <br>
>     "filter": "**`:filter`**" <br>
> } <br>
> OR <br>
> { <br>
>     "filter-expression": "**`:filter-expression`**" <br>
> }

</span>

**Parameters**

| Name                 | type        | Required | Description                                                                             |
| -------------------- | ----------- | -------- | --------------------------------------------------------------------------------------- |
| `:schema`            | string      | Y        | name of the selected schema                                                             |
| `:entity`            | string      | Y        | name of the entity in the selected schema                                               |
| `:filter`            | JSON object | N        | condition `key:value` to filter data. (see: [Optional Parameters](optional-parameters)) |
| `:filter-expression` | string      | N        | free form condition to filter data. (see: [Optional Parameters](optional-parameters))   |

::: tip ℹ️ NOTE
For detailed description of `filter` and `filter-expression` usage, please refer to [Optional Parameters](#optional-parameters)
:::

**Example:**

> To delete data from the entity `my-entity` in the schema `my-schema` where `color = red`:
>
> **Request**
>
> ```http
> DELETE http://127.0.0.1:3000/schema/my-schema/my-entity
> Content-Type: application/json
>
> {
> 	"filter": {
> 		"color": "red"
> 	}
> }
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 204 No Content
> ```

**Response Errors**

| HTTP Code | Message                      |
| --------- | ---------------------------- |
| 400       | Bad Request                  |
| 401       | Invalid username or password |
| 403       | Forbidden                    |
| 404       | Not found                    |
| 500       | Something Went Wrong         |

## Response Objects

All schema endpoints share the same response envelope. On success, the response body contains the following fields:

| Field      | Type   | Description                                                                                                                |
| ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| `schema`   | string | Name of the schema the request was made against                                                                            |
| `entity`   | string | Name of the entity the request was made against. Only present on entity-level endpoints (`/schema/:schema/:entity`)        |
| `status`   | number | HTTP status code of the response                                                                                           |
| `metadata` | object | Free-form key/value metadata attached to the result. Empty `{}` by default                                                 |
| `fields`   | object | Map of field name to field type. Omitted when the result contains no row                                                   |
| `rows`     | array  | Array of row objects. Omitted when the result contains no row. Streamed row by row when `server.response-chunk` is enabled |

The `fields` types are inferred from the values of the first row: `string`, `number`, `boolean`, `date`, `array`, `object`, `null`.

::: tip ℹ️ NOTE
When the result contains no row, the body is reduced to the envelope only: `{ schema, entity, status }`. 
:::

::: tip ℹ️ NOTE
When `server.response-chunk` is enabled, the `rows` array is streamed in chunks instead of being fully materialized in the body.
:::

### List

Shape returned by **GET** `/schema/:schema` to list the entities of a schema.

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "schema": "my-schema",
  "status": 200,
  "metadata": {},
  "fields": {
    "name": "string",
    "type": "string",
    "size": "number"
  },
  "rows": [
    {
      "name": "my-entity1",
      "type": "table",
      "size": 42
    },
    {
      "name": "my-entity2",
      "type": "table",
      "size": 7
    }
  ]
}
```

**`type` and `size` values by Data Provider**

| Data provider       | type Value   | size Value                                      |
| ------------------- | ------------ | ----------------------------------------------- |
| `postgres`          | `table`      | <pre>pg_class.reltuples</pre>                   |
| `mssql`             | `table`      | <pre>sys.partitions</pre>                       |
| `mysql`             | `table`      | <pre>information_schema.tables.TABLE_ROWS</pre> |
| `mongodb`           | `collection` | <pre>listCollections</pre>                      |
| `cosmosdb`          | `container`  | <pre>meta.partitionKey</pre>                    |
| `memory`            | `datatable`  | *Rows count*                                    |
| `storage` (files)   | `file`       | *File size*                                     |
| `storage` (folders) | `folder`     | *No size returned*                              |
| `plans`             | `plan`       | *No size returned*                              |

::: tip ℹ️ NOTE
Listing entites is not avaialable for `metal` and `webservice`.
:::

### Entity

Shape returned by **GET** `/schema/:schema/:entity` to select data from an entity.

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "schema": "my-schema",
  "entity": "my-entity",
  "status": 200,
  "metadata": {},
  "fields": {
    "name": "string",
    "color": "string"
  },
  "rows": [
    {
      "name": "Facebook",
      "color": "blue"
    },
    {
      "name": "YouTube",
      "color": "red"
    }
  ]
}
```

The `fields` and `rows` shapes depend on the entity definition: 
* each key in `fields` corresponds to a column of the entity
* object in `rows` is one record of data.