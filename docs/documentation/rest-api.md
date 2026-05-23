---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

# Metal API

Metal offers a REST API specifically crafted to execute a range of functions:

- Conducting CRUD operations (including select, update, delete, insert)
- Facilitating data transformation
- Implementing a data caching mechanism for a specified duration

| Endpoint Starting | Usage              | Metal version                         |
| ----------------- | ------------------ | ------------------------------------- |
| `/user/`…         | User operations    | <Badge type="default" text="v0.1+" /> |
| `/server/`…       | Server operations  | <Badge type="default" text="v0.1+" /> |
| `/schema/`…       | Schemas operations | <Badge type="default" text="v0.1+" /> |
| `/plan/`…         | Plans operations   | <Badge type="default" text="v0.1+" /> |
| `/schedule/`…     | Schedule operations| <Badge type="default" text="v0.5+" /> |
| `/cache/`…        | Cache operations   | <Badge type="default" text="v0.1+" /> |

## `/user/`…

This endpoint serves as the entry point for User operations.
The table below describes available endpoints and methods to use for request :

| Endpoint       | Method | Usage                                         | Metal version                         |
| -------------- | ------ | --------------------------------------------- | ------------------------------------- |
| `/user/login`  | POST   | Authenticate a Metal user                     | <Badge type="default" text="v0.1+" /> |
| `/user/logout` | POST   | Log out current Metal user                    | <Badge type="default" text="v0.1+" /> |
| `/user/info`   | GET    | Get informations about the current Metal user | <Badge type="default" text="v0.1+" /> |

---

### `/user/login`

The login endpoint is used to authenticate a user in the Metal system.

Metal has its own user authentication mechanism that is separate from the credentials provided by data providers.

To enable user authentication in Metal, you need to configure [`server.authentication`](config-yml.md#authentication) in the configuration file.

For more information about authentication, see [Understanding Authentication, Users, and Roles in Metal Server](../guides/authentication.md)

**Endpoint**

> **POST** /user/login

**Body Parameters**

| Name     | Type   | Requried | Description   |
| -------- | ------ | -------- | ------------- |
| username | string | Y        | User name     |
| password | string | Y        | User password |

**Example**

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
>   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNjg0MTU4NDY2LCJleHAiOjE2ODQxNjIwNjZ9.Ha76OxFe1Bxn-8PnpjmXeWDvhsjQu9BnOIoBpkWJdw0"
> }
> ```

**Response Errors**

| HTTP Code | Message                      |
| --------- | ---------------------------- |
| 400       | Bad Request                  |
| 401       | Invalid username or password |
| 500       | Something Went Wrong         |

---

### `/user/logout`

The logout functionality allows the current logged-in Metal user to end their session.

When a user logs out, it terminates their current session and invalidates the associated authentication token.

**Endpoint**

> **POST** /user/logout

**Example**

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

### `/user/info`

This feature provides access to detailed information about the currently logged-in user in the Metal system.

**Endpoint**

> **GET** /user/info

**Example**

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
>   "username": "admin"
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

## `/server/`…

This endpoint serves as the entry point for Server operations.
The table below describes available endpoints and methods to use for request :

| Endpoint                | Method | Usage                                  | Metal version                         |
| ----------------------- | ------ | -------------------------------------- | ------------------------------------- |
| `/server/info`          | GET    | Get informations about Metal server    | <Badge type="default" text="v0.1+" /> |
| `/server/reload`        | POST   | Reload configuration file and apply it | <Badge type="default" text="v0.1+" /> |
| `/server/reload-plans`  | POST   | Reload plans from configuration file   | <Badge type="default" text="v0.5+" /> |

---

### `/server/info`

Get informations about Metal server

**Endpoint**

> **GET** /server/info

**Example**

> **Request**
>
> ```http
> GET http://127.0.0.1:3000/server/info
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 200 OK
> Content-Type: application/json
>
> {
> 	"server" : "Metal",
> 	"version" : "0.3"
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

### `/server/reload`

Reloads server configuration file `config.yml` and applies settings

::: warning ⚠️ IMPORTANT
When reloading, all connections will be reset.
:::

**Endpoint**

> **POST** /server/reload

**Example**

> **Request**
>
> ```http
> POST http://127.0.0.1:3000/server/reload
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 200 OK
> Content-Type: application/json
>
> {
>   "message": "Server reloaded"
> }
> ```

**Response Errors**

| HTTP Code | Message                      |
| --------- | ---------------------------- |
| 400       | Bad Request                  |
| 401       | Invalid username or password |
| 403       | Forbidden                    |
| 500       | Something Went Wrong         |

### `/server/reload-plans`

Reloads all plans from the configuration file without restarting the server.

**Endpoint**

> **POST** /server/reload-plans

**Example**

> **Request**
>
> ```http
> POST http://127.0.0.1:3000/server/reload-plans
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 200 OK
> Content-Type: application/json
>
> {
>   "message": "Plans and schedules reloaded successfully"
> }
> ```

**Response Errors**

| HTTP Code | Message                      |
| --------- | ---------------------------- |
| 400       | Bad Request                  |
| 401       | Invalid username or password |
| 403       | Forbidden                    |
| 500       | Something Went Wrong         |

## `/schema`/…

This endpoint serves as the entry point for Entities operations.
The table below describes available endpoints and methods to use for request :

| Endpoint                              | Method                   | Usage                                                                                     | Metal version                         |
| ------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------- |
| `/schema`/**`:schema`**               | GET                      | Lists entities in the `:schema`                                                           | <Badge type="default" text="v0.3+" /> |
| `/schema`/**`:schema`**/**`:entity`** | GET, POST, PATCH, DELETE | Performs CRUD operations for one or many items in the `:entity` existing in the `:schema` | <Badge type="default" text="v0.1+" /> |

### `/schema/:schema`

| HTTP Method | Usage                                  |
| ----------- | -------------------------------------- |
| GET         | Returns list of entities in the schema |

#### GET

Returns list of the entities of the schema provided in URL parameters.

**Endpoint**

<span style="font-family: 'Space Grotesk', monospace;">

> **GET** /schema/**`:schema`**

</span>

**Path Parameters**

| Name      | type   | Required | Description                 |
| --------- | ------ | -------- | --------------------------- |
| `:schema` | string | Y        | name of the selected schema |

**Example**

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

### `/schema/:schema/:entity`

| HTTP Method | Usage                     |
| ----------- | ------------------------- |
| GET         | Return data of the entity |
| POST        | Insert data in the entity |
| PATCH       | Update data in the entity |
| DELETE      | Delete data in the entity |

#### GET

Returns data from the entity of the schema provided in URL parameters. By default, `select` return all available data in the entity :

**Endpoint**

<span style="font-family: 'Space Grotesk', monospace;">

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
| `:cache`             | number      | N        | time in seconds to cache data. (see: [Optional Parameters](optional-parameters))        | <Badge type="default" text="v0.1+" /> |

::: tip ℹ️ NOTE
For detailed description of `fields`, `filter`, `filter-expression`, `sort`, `cache` usage, please refer to [Optional Parameters](#optional-parameters)
:::

**Example**

> To select all datas from the schema `my-schema` and the entity `my-entity` where `color = red`:
>
> **Request**
>
> ```http
> GET http://127.0.0.1:3000/schema/my-schema/my-entity?filter={color:"red"}
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 200 OK
> Content-Type: application/json
>
> {
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

#### POST

Insert one or more objects in the entity of the schema provided in URL parameters:

**Endpoint**

<span style="font-family: 'Space Grotesk', monospace;">

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

**Example**

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

#### PATCH

Modify data in the entity of the schema provided in URL parameters.

::: danger 🛑 BE CAREFULL
If no filtering is supplied in the body with `filter` or `filter-expression`, ALL DATA IN THE ENTITY WILL BE MODIFIED !
:::

**Endpoint**

<span style="font-family: 'Space Grotesk', monospace;">

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

**Example**

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

#### DELETE

Deletes data from the entity in the schema provided in URL parameters.

::: danger 🛑 BE CAREFULL
If no filtering is supplied in the body with `filter` or `filter-expression`, ALL DATA IN THE ENTITY WILL BE DELETED !
:::

**Endpoint**

<span style="font-family: 'Space Grotesk', monospace;">

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

**Example**

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

---

## `/plan/`…

This endpoint serves as the entry point for Plans operations.
The table below describes available endpoints and methods to use for request :

| Endpoint                      | Method | Usage                                                                     | Metal version                         |
| ----------------------------- | ------ | ------------------------------------------------------------------------- | ------------------------------------- |
| `/plan`/**`:plan`**/`reload`  | POST   | Reload the plan `:plan` definition as described in the configuration file | <Badge type="default" text="v0.1+" /> |
| `/plan`/**`:plan`**/`metrics` | POST   | Get execution metrics for the plan `:plan`                                | <Badge type="default" text="v0.5+" /> |

### `/plan`/**`:plan`**/`reload`

Reload the plan `:plan` definition as described in the configuration file.

**Endpoint**

> **POST** /plan/**`:plan`**/reload

**Path Parameters**

| Name    | type   | Required | Description               |
| ------- | ------ | -------- | ------------------------- |
| `:plan` | string | Y        | name of the selected plan |

**Example**

> **Request**
>
> ```http
> POST  http://127.0.0.1:3000/plan/my-plan/reload
> Content-Type: application/json
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 200 OK
> Content-Type: application/json; charset=utf-8
>
> {
>    "plan": "my-plan",
>    "message": "Plan reloaded"
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

### `/plan`/**`:plan`**/`metrics`

Returns execution metrics for the plan `:plan`.

**Endpoint**

> **POST** /plan/**`:plan`**/metrics

**Path Parameters**

| Name    | type   | Required | Description               |
| ------- | ------ | -------- | ------------------------- |
| `:plan` | string | Y        | name of the selected plan |

**Example**

> **Request**
>
> ```http
> POST  http://127.0.0.1:3000/plan/my-plan/metrics
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 200 OK
> Content-Type: application/json; charset=utf-8
>
> {
>    "planName": "my-plan",
>    "startTime": "2025-01-01T00:00:00.000Z",
>    "endTime": "2025-01-01T00:00:01.500Z",
>    "durationMs": 1500,
>    "status": "success",
>    "steps": [
>        {
>            "index": 0,
>            "command": "select",
>            "status": "completed",
>            "outcome": "success",
>            "durationMs": 200
>        }
>    ]
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

## `/schedule/`…

This endpoint serves as the entry point for Schedule operations.
The table below describes available endpoints and methods to use for request :

| Endpoint                              | Method | Usage                         | Metal version                         |
| ------------------------------------- | ------ | ----------------------------- | ------------------------------------- |
| `/schedule`/**`:jobName`**/`start`    | POST   | Start a scheduled job         | <Badge type="default" text="v0.5+" /> |
| `/schedule`/**`:jobName`**/`stop`     | POST   | Stop a scheduled job          | <Badge type="default" text="v0.5+" /> |

---

### `/schedule`/**`:jobName`**/`start`

Starts a scheduled job by name.

**Endpoint**

> **POST** /schedule/**`:jobName`**/start

**Path Parameters**

| Name       | type   | Required | Description              |
| ---------- | ------ | -------- | ------------------------ |
| `:jobName` | string | Y        | name of the job to start |

**Example**

> **Request**
>
> ```http
> POST  http://127.0.0.1:3000/schedule/my-job/start
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 200 OK
> Content-Type: application/json
>
> {
>   "message": "Job 'my-job' started"
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

### `/schedule`/**`:jobName`**/`stop`

Stops a scheduled job by name.

**Endpoint**

> **POST** /schedule/**`:jobName`**/stop

**Path Parameters**

| Name       | type   | Required | Description             |
| ---------- | ------ | -------- | ----------------------- |
| `:jobName` | string | Y        | name of the job to stop |

**Example**

> **Request**
>
> ```http
> POST  http://127.0.0.1:3000/schedule/my-job/stop
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 200 OK
> Content-Type: application/json
>
> {
>   "message": "Job 'my-job' stopped"
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

## `/cache/`…

This endpoint serves as the entry point for Cache operations.
The table below provides an overview of the available endpoints and the corresponding methods to be used for each request:

| Endpoint       | Method | Description                      | Metal version                         |
| -------------- | ------ | -------------------------------- | ------------------------------------- |
| `/cache/view`  | GET    | Retrieve and display cached data | <Badge type="default" text="v0.1+" /> |
| `/cache/clean` | POST   | Remove expired cached data       | <Badge type="default" text="v0.1+" /> |
| `/cache/purge` | POST   | Delete all cached data           | <Badge type="default" text="v0.1+" /> |

---

### `/cache/view`

This endpoint allows you to retrieve and display the cached data.
It returns the cached data in a readable format, providing insights into the stored information.

**Endpoint**

> **GET** /cache/view

**Example**

> **Request**
>
> ```http
> GET http://127.0.0.1:3000/cache/view
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 200 OK
> Content-Type: application/json
>
> {
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

### `/cache/clean`

With this endpoint, you can remove any expired cached data.
It helps in maintaining the cache server's efficiency by eliminating outdated or irrelevant information.

**Endpoint**

> **POST** /cache/clean

**Example**

> **Request**
>
> ```http
> POST http://127.0.0.1:3000/cache/clean
> Content-Type: application/json
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 200 OK
> Content-Type: application/json
>
> {
>   "message": "Cache cleaned"
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

### `/cache/purge`

It enables you to delete all the cached data in one go.
This action can be useful when you need to clear the cache completely, such as during system maintenance or when starting fresh.

**Endpoint**

> **POST** /cache/purge

**Example**

> **Request**
>
> ```http
> POST http://127.0.0.1:3000/cache/purge
> Content-Type: application/json
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 200 OK
> Content-Type: application/json
>
> {
>   "message": "Cache purged"
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
