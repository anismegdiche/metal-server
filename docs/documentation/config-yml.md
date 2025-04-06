---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

# Configuration File Reference

`config.yml` is the Metal configuration file, a YAML file used to configure sources, schemas, and plans.

**Example `config.yml`**

```yaml
version: "0.3"

server:
  port: 3000

sources:
  my-source:
    provider: postgres
    host: localhost
    port: 5432
    user: myuser
    password: myStr@ngpa$$w0rd
    database: mydatabase

schemas:
  my-schema:
    source: my-source
```

## `version` <Badge type="default" text="^0.1"/>

Defines the version used for the configuration.
Accepted values :
`0.3`, `0.4`

**Example:**

```yaml
version: "0.4"
```

## `server` <Badge type="default" text="^0.1" />

Defines the configuration of the Metal server.

The parameters that can be configured inside the `server` section include:

| Parameter        | Type    | Required | Decription                                    | Metal version                        |
| ---------------- | ------- | -------- | --------------------------------------------- | ------------------------------------ |
| `authentication` | Object  | Y        | Configure user authentication                 | <Badge type="default" text="^0.3" /> |
| `port`           | Integer | N        | Server TCP port (default: `3000`)             | <Badge type="default" text="^0.1" /> |
| `timezone`       | String  | N        | Timezone setting (default: `UTC`)             | <Badge type="default" text="^0.1" /> |
| `verbosity`      | String  | N        | Logging level (default: `warn`)               | <Badge type="default" text="^0.1" /> |
| `cache`          | Object  | N        | Cache configuration(see: [sources](#sources)) | <Badge type="default" text="^0.1" /> |
| `request-limit`  | String  | N        | Define request limit (default: `10mb`)        | <Badge type="default" text="^0.1" /> |
| `response-limit` | String  | N        | Define response limit (default: `10mb`)       | <Badge type="default" text="^0.3" /> |
| `response-rate`  | Object  | N        | Define response rate limit                    | <Badge type="default" text="^0.3" /> |

**Example:**

```yaml
server:
  port: 3000
  verbosity: debug
  cache:
    provider: mongodb
    uri: mongodb://localhost:27017/
    database: metal_cache
    options:
      connectTimeoutMS: 5000
      serverSelectionTimeoutMS: 5000
```

### `port` <Badge type="default" text="^0.1" />

Defines the Metal server's TCP port for API exposure.

Default: `3000`

### `verbosity` <Badge type="default" text="^0.1" />

Sets the console logging verbosity, which can be one of the following values:

- `trace`
- `debug`
- `info`
- `warn`
- `error`

Default: `warn`

::: warning ⚠️ IMPORTANT
Using `debug` or `trace` can significantly reduce the performance of Metal server.
:::

### `cache` <Badge type="default" text="^0.1" />

Sets the Database server for storing cache objects. The configuration is the same as a source. (See: [sources](#sources))

This parameter must be configured if you plan to use the cache feature in Metal server.

### `timezone` <Badge type="default" text="^0.1" />

Sets the server's timezone.

A list of acceptable timezone values can be found [here](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).

Default: `UTC`

### `authentication`⚡ <Badge type="default" text="^0.3" />

Sets the authentication configuration for the Metal server.

The parameters that can be configured inside the `server` section include:

| Parameter      | Type         | Required | Decription                                                                                                | Metal version                        |
| -------------- | ------------ | -------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `provider`     | Enum(String) | Y        | Authentication Provider, defaults to `local` (see: [Authentication providers](#authentication-providers)) | <Badge type="default" text="^0.3" /> |
| `default-role` | String       | N        | Default role assigned to the user when is authenticated, defaults empty. (see: [roles](#roles))           | <Badge type="default" text="^0.3" /> |
| `autocreate`   | String       | N        | Populate automatically `users` with the authenticated user if not exist, defaults to `false`              | <Badge type="default" text="^0.3" /> |

**Authentication providers** :

| Provider | Description                                                                      | Metal version                        |
| -------- | -------------------------------------------------------------------------------- | ------------------------------------ |
| `local`  | Enables local authentication through Metal server using declared [users](#users) | <Badge type="default" text="^0.3" /> |
| `oidc`   | Enables OpenID Connect authentication with an external provider                  | <Badge type="info" text="^0.4" />    |

**Example:**

```yaml
server:
  authentication:
    type: local
```

::: tip ℹ️ TIP
For more informations about authentication, roles and users, please refer to the [Authentication](../guides/authentication.md) guide.

:::

### `request-limit` <Badge type="default" text="^0.1" />

Controls the maximum request body size. If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the bytes library for parsing.
For supported values, see [here](https://www.npmjs.com/package/bytes).

When exeeded, an error PAYLOAD TOO LARGE(413) will occur.

Default: `10mb`

### `response-limit` <Badge type="default" text="^0.3" />

Controls the maximum response body size. If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the bytes library for parsing.
For supported values, see [here](https://www.npmjs.com/package/bytes).

When exeeded, an error CONTENT TOO LARGE(413) will occur.

Default: `10mb`

### `response-rate` <Badge type="default" text="^0.3" />

Controls the maximum request per window.
The parameters that can be configured inside the `response-rate` section include:

| Parameter  | Type    | Required | Description                                                                                                                                                                                                      | Metal version                        |
| ---------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `windowMs` | Integer | Y        | The time window for rate limiting, in milliseconds. For example, `60000` milliseconds (60 seconds).                                                                                                              | <Badge type="default" text="^0.3" /> |
| `max`      | Integer | Y        | The maximum number of requests allowed within the `windowMs` time window. For example, `600` requests.                                                                                                           | <Badge type="default" text="^0.3" /> |
| `message`  | String  | N        | The message to be sent when the rate limit is exceeded. This can be a custom message indicating that the user has made too many requests. For example, "Too many requests from this IP, please try again later." | <Badge type="default" text="^0.3" /> |

If exeeded, an error TOO MANY REQUEST(429) will occur.

Default:

- windowMs: `60000`
- max: `600`
- message: `Too many requests from this IP, please try again later`

## `roles` <Badge type="default" text="^0.3" />

Sets the list of roles with associated permissions used when authentication is enabled with `server.authentication`. Each role is defined by a unique name and a string of permissions where each character represents a specific permission:

| Permission | Description          | Metal version                        |
| ---------- | -------------------- | ------------------------------------ |
| `c`        | Create data          | <Badge type="default" text="^0.3" /> |
| `r`        | Read data            | <Badge type="default" text="^0.3" /> |
| `u`        | Update data          | <Badge type="default" text="^0.3" /> |
| `d`        | Delete data          | <Badge type="default" text="^0.3" /> |
| `a`        | Administrate server  | <Badge type="default" text="^0.3" /> |
| `l`        | List schema entities | <Badge type="default" text="^0.3" /> |

**Example:**

```yaml
roles:
  admin: arl
  all-rights: crudla
  guest: r
```

## `users` <Badge type="default" text="^0.1" />

Declares a list of Metal users used when authentication is enabled with `server.authentication`.

**Example:**

```yaml
users:
  admin: 123456
  guest: "654321"
```

## `sources` <Badge type="default" text="^0.1" />

This section contains all source declarations and configurations that are applied to each database server endpoint connection, much like a connection string used in development.

Every source is declared with a name, followed by the appropriate data provider configuration and options if needed.

::: tip ℹ️ NOTE
When declaring a source, the parameters that can be configured inside are: `provider`, `host`, `port`, `user`, `password`, `database`, and `options`.
:::

**Example:**

```yaml
sources:
  my-postgresql-db:
    provider: postgres
    host: 192.168.1.113
    port: 5433
    user: root
    password: Azerty123!
    database: sampledb

  my-ms-sql-db:
    provider: mssql
    host: 192.168.1.123
    port: 1433
    user: sa
    password: Azerty123!
    database: SampleDB
```

The parameters that can be configured inside a source include:

| Parameter  | Type         | Required | Decription             | Metal version                        |
| ---------- | ------------ | -------- | ---------------------- | ------------------------------------ |
| `provider` | Enum(String) | Y        | Provider type          | <Badge type="default" text="^0.1" /> |
| `database` | String       | Y        | Provider database      | <Badge type="default" text="^0.1" /> |
| `host`     | String       | N        | Host server            | <Badge type="default" text="^0.1" /> |
| `port`     | Integer      | N        | Host port              | <Badge type="default" text="^0.1" /> |
| `user`     | String       | N        | Provider user          | <Badge type="default" text="^0.1" /> |
| `password` | String       | N        | Provider user password | <Badge type="default" text="^0.1" /> |
| `options`  | Object       | N        | Additional options     | <Badge type="default" text="^0.1" /> |

### `provider` <Badge type="default" text="^0.1" />

Defines the data provider type.

The table below describes the different values that can be configured in the `provider` parameter:

| Value      | DBMS Provider                             | Metal version                        |
| ---------- | ----------------------------------------- | ------------------------------------ |
| `postgres` | PostgreSQL                                | <Badge type="default" text="^0.1" /> |
| `mssql`    | Azure Sql Database, Microsoft SQL Server  | <Badge type="default" text="^0.1" /> |
| `mongodb`  | MongoDB                                   | <Badge type="default" text="^0.1" /> |
| `plan`     | Connect to Metal Plan                     | <Badge type="default" text="^0.2" /> |
| `files`    | Files as tables abstraction data provider | <Badge type="default" text="^0.2" /> |
| `metal`    | Metal Server via REST                     | <Badge type="default" text="^0.2" /> |
| `memory`   | Local Memory storage (Non-persistant)     | <Badge type="default" text="^0.2" /> |

For more detailed information about how to configure a data provider, See: [Data Providers Configurations](./data-providers-config.md)

::: tip ℹ️ NOTE
When using `plan` as a data provider, you only need to provide the name of the plan as `database` parameter.
Example:

```yaml
sources:
  my-source-from-plan:
    provider: plan
    database: my-plan
```

:::

**Example:**

If we want to declare a source named `my-postgresql-db` using the PostgreSQL data provider, we write:

```yaml
sources:
  my-postgresql-db:
    provider: postgres
```

### `host` <Badge type="default" text="^0.1" />

Defines the DBMS server host.

**Example:**

```yaml
sources:
  my-postgresql-db:
    host: 10.11.12.13
```

::: warning ⚠️ IMPORTANT
For MongoDB, the host must be provided in the URI form `mongodb://my-server:my-server-port/`. Example: `mongodb://localhost:27017/`.
:::

::: tip ℹ️ NOTE
MS SQL Server can be provided in the form `MY-SERVER\MY-INSTANCE`.
:::

### `port` <Badge type="default" text="^0.1" />

Defines the DBMS TCP port.

**Example:**

```yaml
sources:
  my-postgresql-db:
    port: 5432
```

::: warning ⚠️ IMPORTANT
This parameter is unnecessary for MongoDB.
:::

### `user` <Badge type="default" text="^0.1" />

Defines the user to connect to the DBMS server.

**Example:**

```yaml
sources:
  my-postgresql-db:
    user: root
```

### `password` <Badge type="default" text="^0.1" />

Defines the DBMS user password.

**Example:**

```yaml
sources:
  my-postgresql-db:
    password: MySecretPassword
```

### `database` <Badge type="default" text="^0.1" />

Defines the name of the database to connect to.

**Example:**

```yaml
sources:
  my-postgresql-db:
    database: mydatabase
```

### `options` <Badge type="default" text="^0.1" />

This parameter defines optional parameters to be passed to the data provider.

**Example:**

```yaml
sources:
  mongo-db1:
    provider: mongodb
    host: mongodb://localhost:27017/
    database: myDatabase
    options:
      connectTimeoutMS: 5000
      serverSelectionTimeoutMS: 5000
```

::: tip ℹ️ NOTE
For more information about how to configure a data provider and its options, See: [Data Providers Configurations](./data-providers-config.md)
:::

## `schemas` <Badge type="default" text="^0.1" />

This section is used to declare virtual schemas.

A schema is a mapping of DBMS source and tables mapping, and it serves as the main access point. If you want to allow access to a database or a combination of databases, you must declare your schemas here to expose them to the API.

::: tip ℹ️ NOTE
When declaring a schema, the parameters that can be configured inside are: `source` and `entities`.
:::

::: warning ⚠️ IMPORTANT
If there's no `schemas` declaration in `config.yml`, Metal server will not expose any data to the API, implying its use as a scheduled ETL tool (see: Use Case, CRON ETL).
:::

**Example:**

```yaml
schemas:
  my-schema1:
    source: my-mssql-db

  my-schema2:
    entities:
      my-entity1:
        source: my-mongodb-source
        entity: entity1
      my-entity2:
        source: my-postgres-source
        entity: entity2
```

The parameters that can be configured inside a source include:

| Parameter   | Decription                        | Metal version                        |
| ----------- | --------------------------------- | ------------------------------------ |
| `source`    | Source to use                     | <Badge type="default" text="^0.1" /> |
| `entities`  | Detailed entities configuration   | <Badge type="default" text="^0.1" /> |
| `anonymize` | to anonymize data of given fields | <Badge type="default" text="^0.3" /> |

### `source` <Badge type="default" text="^0.1" />

Declare which source to use from the `sources` section. (See: [sources](#sources))

**Example:**

```yaml
schemas:
  my-schema1:
    source: my-mssql-db
```

### `entities` <Badge type="default" text="^0.1" />

Used to declare each entity from sources. It is possible to declare entities from different sources. Only declared entities are visible.

When declaring an entity, two parameters must be configured inside:

- `source`: the name of a declared source
- `entity`: the name of an entity that is in the source

**Example:**

```yaml
schemas:
  my-schema2:
    entities:
      my-entity1:
        source: my-mongodb-source
        entity: entity1
      my-entity2:
        source: my-plan
        entity: entity2
```

::: tip ℹ️ TIP
It is possible to combine `source` and `entities` in the same schema declaration.

Example:

```yaml
schemas:
  my-merged-schema:
    source: my-mssql-source
    entities:
      my-entity1:
        source: my-mongodb-source
        entity: entity1
      my-entity2:
        source: my-postgres-source
        entity: entity2
```

:::

### `anonymize` <Badge type="default" text="^0.3" />

To anonymize data of given fields. It can be unique field or a list of fields seperated with comma.

Use `*` value to anonymize all fields.

Please note that when using this feature all corresponding fields name of any entity from the source are anonymized.

**Example**

```yaml
schemas:
  my-schema1:
    source: my-mssql-db
    anonymize: contact_name, company_name
```

::: warning ⚠️ Warning
When using `anonymize` in a schema and in a plan, data will be anonymized twice.
:::

## `ai-engines` <Badge type="default" text="^0.1" />

This section declares AI engine processors like Tesseract.js and NLP.js to be used in plans with the command `run` (see: [run](#run))

The parameters that can be configured inside an AI engine include:

| Parameter | Decription                     | Metal version                        |
| --------- | ------------------------------ | ------------------------------------ |
| `engine`  | AI engine to use               | <Badge type="default" text="^0.1" /> |
| `model`   | Model handled by the AI engine | <Badge type="default" text="^0.1" /> |
| `options` | Additional options             | <Badge type="default" text="^0.1" /> |

For more detailed information about how to configure an AI engine, See: [AI Engines Configurations](./ai-engines-config.md)

**Example**

```yaml
ai-engines:
  my-sentiment-analyzer:
    engine: nlpjs
    model: sentiment
    options:
      lang: en
```

## `plans` <Badge type="default" text="^0.1" />

This section is used to declare plans which are an ETL steps.
It can be used on the fly by calling a schema conneted to a plan or by scheduling as a job.

In each plan you must declare at least one entity in which the steps will be executed

**Example**

```yaml
plans:
  my-plan:
    my-first-entity:
    my-second-entity:
```

::: tip ℹ️ TIP
You may call a declared entity in the plan, in that case the steps hocked to the second entity will be executed

**Example**

```yaml
plans:
  my-plan:
    my-first-entity:
      - select:
          schema: demo
          entity: users
          fields: login, partner_id
    my-second-entity:
      - select:
          schema: demo
          entity: contacts
          fields: id, name, display_name
      - join:
          type: left
          entity: my-first-entity
          left-field: partner_id
          right-field: id
```

:::

The steps that can be configured inside a plan can be:

| Step command        | Decription                                                                                       | Metal version                        |
| ------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------ |
| `select`            | to select data from an entity. If schema is not provided, actual plan's entity data will be used | <Badge type="default" text="^0.1" /> |
| `insert`            | to insert data to an entity. If schema is not provided, actual plan's entity data will be used   | <Badge type="default" text="^0.1" /> |
| `delete`            | to delete data from an entity. If schema is not provided, actual plan's entity data will be used | <Badge type="default" text="^0.1" /> |
| `update`            | to update data of an entity. If schema is not provided, actual plan's entity data will be used   | <Badge type="default" text="^0.1" /> |
| `debug`             | to enable steps debug                                                                            | <Badge type="default" text="^0.1" /> |
| `break`             | to stop plan execution at this step                                                              | <Badge type="default" text="^0.1" /> |
| `join`              | to perform data joins (Left,Right,Inner,Full outer and Cross)                                    | <Badge type="default" text="^0.1" /> |
| `sort`              | to sort actual data                                                                              | <Badge type="default" text="^0.1" /> |
| `fields`            | fields to keep from actual data                                                                  | <Badge type="default" text="^0.1" /> |
| `run`               | to run an AI Engine                                                                              | <Badge type="default" text="^0.1" /> |
| `sync`              | to synchronize data from data source to a data destination                                       | <Badge type="default" text="^0.2" /> |
| `anonymize`         | to anonymize data of given fields                                                                | <Badge type="default" text="^0.3" /> |
| `remove-duplicates` | to remove duplicated rows                                                                        | <Badge type="default" text="^0.3" /> |
| `list-entities`     | to list entities in a schema                                                                     | <Badge type="default" text="^0.3" /> |

### `list-entities` <Badge type="default" text="^0.3" />

To list entities in a schema.
If schema is not provided, a list of actual plan's entities will be returned.

The parameters that can be configured inside `select` tag are :

| Name     | Decription     | Metal version                        |
| -------- | -------------- | ------------------------------------ |
| `schema` | name of schema | <Badge type="default" text="^0.3" /> |

**Example**

```yaml
plans:
  my-plan:
    my-entity:
      - list-entities:
        schema: my-schema
```

### 📜`select`⚡ <Badge type="default" text="^0.1" />

To select data from an entity.
If schema is not provided, actual plan's entity data will be returned.

The parameters that can be configured inside `select` tag are :

| Name                  | Decription                                                                                       | JS Context                                                                                   | Metal version                        |
| --------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------ |
| `schema`              | name of schema                                                                                   | N/A                                                                                          | <Badge type="default" text="^0.1" /> |
| `entity`              | name of entity in the `schema`                                                                   | N/A                                                                                          | <Badge type="default" text="^0.1" /> |
| 📜`fields`            | fields to keep, comma seperated. (see: [Optional Parameters](rest-api#optional-parameters))      | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" />    |
| 📜`filter`            | condition `key:value` to filter data. (see: [Optional Parameters](rest-api#optional-parameters)) | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" />    |
| 📜`filter-expression` | free form condition to filter data. (see: [Optional Parameters](rest-api#optional-parameters))   | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" />    |
| 📜`sort`              | sort data, can be `asc` or `desc`. (see: [Optional Parameters](rest-api#optional-parameters))    | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" />    |
| `cache`               | time in seconds to cache data. (see: [Optional Parameters](rest-api#optional-parameters))        | N/A                                                                                          | <Badge type="default" text="^0.1" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Example**

```yaml
plans:
  my-plan:
    my-entity:
      - select:
        schema: demo
        entity: users
        fields: login, partner_id
```

### 📜`insert`⚡ <Badge type="default" text="^0.1" />

To insert data to an entity.
If schema is not provided, actual plan's entity data will be modified

The parameters that can be configured inside `insert` tag are :

| Name     | Description                                                                                     | JS Context                                                                                   | Metal version                        |
| -------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------ |
| `schema` | name of schema                                                                                  | N/A                                                                                          | <Badge type="default" text="^0.1" /> |
| `entity` | name of entity in the `schema`                                                                  | N/A                                                                                          | <Badge type="default" text="^0.1" /> |
| 📜`data` | data to be inserted in the `entity`. (see: [Optional Parameters](rest-api#optional-parameters)) | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" />    |

📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Example**

```yaml
plans:
  my-plan:
    my-entity:
      - insert:
          schema: my-schema
          entity: search-engine
          data:
            - name: Google
              url: https://www.google.com
            - name: Yahoo
              url: https://www.yahoo.com
            - name: Bing
              url: https://www.bing.com
```

### 📜`delete`⚡ <Badge type="default" text="^0.1" />

To delete data from an entity.
If schema is not provided, actual plan's entity data will be modified

The parameters that can be configured inside `delete` tag are :

| Name                  | Description                                                                                      | JS Context                                                                                   | Metal version                        |
| --------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------ |
| `schema`              | name of schema                                                                                   | N/A                                                                                          | <Badge type="default" text="^0.1" /> |
| `entity`              | name of entity in the `schema`                                                                   | N/A                                                                                          | <Badge type="default" text="^0.1" /> |
| 📜`filter`            | condition `key:value` to filter data. (see: [Optional Parameters](rest-api#optional-parameters)) | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" />    |
| 📜`filter-expression` | free form condition to filter data. (see: [Optional Parameters](rest-api#optional-parameters))   | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" />    |

📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Example**

```yaml
plans:
  my-plan:
    my-entity:
      - delete:
          schema: my-schema
          entity: users
          filter-expression: "id >= 100"
```

### 📜`update`⚡ <Badge type="default" text="^0.1" />

To update data of an entity.
If schema is not provided, actual plan's entity data will be modified

The parameters that can be configured inside `update` tag are :

| Name                  | Description                                                                                      | JS Context                                                                                   | Metal version                        |
| --------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------ |
| `schema`              | name of schema                                                                                   | N/A                                                                                          | <Badge type="default" text="^0.1" /> |
| `entity`              | name of entity in the `schema`                                                                   | N/A                                                                                          | <Badge type="default" text="^0.1" /> |
| 📜`filter`            | condition `key:value` to filter data. (see: [Optional Parameters](rest-api#optional-parameters)) | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" />    |
| 📜`filter-expression` | free form condition to filter data. (see: [Optional Parameters](rest-api#optional-parameters))   | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" />    |
| 📜❇️`data`            | data to be inserted in the `entity`. (see: [Optional Parameters](rest-api#optional-parameters))  | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" />    |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))
>
> ❇️: Supports Field Escape Engine (see: [Field Escape Engine](dynamic-expression-engine#field-escape-engine))

**Example**

```yaml
plans:
  my-plan:
    my-entity:
      - update:
          schema: my-schema
          entity: users
          filter:
            is_anonymized: true
          data:
            name: "******"
```

### `debug` <Badge type="default" text="^0.1" />

Enable plan steps debugging to be visible in the metadata of the JSON return.
It can be one of the following values :
nothing, `error`

**Example**

```yaml
plans:
  my-plan:
    my-entity:
      - debug:
```

### `break` <Badge type="default" text="^0.1" />

To stop execution of the plan at this step.

**Example**

```yaml
plans:
  my-plan:
    my-entity:
      - break:
```

### 📜`join`⚡ <Badge type="default" text="^0.1" />

To perform data joins (Left,Right,Inner,Full outer and Cross)

The parameters that can be configured inside `join` tag are :

| Name            | Description                                                          | JS Context                                                                                   | Metal version                        |
| --------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------ |
| 📜`schema`      | name of schema. If not provided actual plan will be used as a schema | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" />    |
| 📜`entity`      | name of entity in the `schema`                                       | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" />    |
| `type`          | Join type can be `left`,`right`,`inner`,`full-outer`,`cross`         | N/A                                                                                          | <Badge type="default" text="^0.1" /> |
| 📜`left-field`  | Left field for equality with `right-field`                           | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" />    |
| 📜`right-field` | Right field                                                          | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" />    |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

The `type` parameter can be :

| Value        | Description     | Metal version                        |
| ------------ | --------------- | ------------------------------------ |
| `left`       | Left Join       | <Badge type="default" text="^0.1" /> |
| `right`      | Right Join      | <Badge type="default" text="^0.1" /> |
| `inner`      | Inner Join      | <Badge type="default" text="^0.1" /> |
| `full-outer` | Full Outer Join | <Badge type="default" text="^0.1" /> |
| `cross`      | Cross Join      | <Badge type="default" text="^0.1" /> |

**Example**

```yaml
plans:
  my-plan:
    my-first-entity:
      - select:
          schema: demo
          entity: users
          fields: login, partner_id
    my-second-entity:
      - select:
          schema: demo
          entity: contacts
          fields: id, name, display_name
      - join:
          type: left
          entity: my-first-entity
          left-field: partner_id
          right-field: id
```

### `sort` <Badge type="default" text="^0.1" />

To sort actual plan's entity data

This command accept a list of one or many entity's fields and sorting order :

- `asc` for ascending
- `desc` for descending

If sorting order is not provided, ascending will be used

**Example**

```yaml
plans:
  my-plan:
    my-second-entity:
      - select:
          schema: my-schema
          entity: contacts
          fields: id, name, display_name
      - sort:
          id:
```

### `fields` <Badge type="default" text="^0.1" />

To keep fields from actual plan's entity data

```yaml
plans:
  my-plan:
    my-first-entity:
      - select:
          schema: demo
          entity: users
    my-second-entity:
      - select:
          schema: demo
          entity: contacts
      - join:
          type: left
          entity: my-first-entity
          left-field: partner_id
          right-field: id
      - fields: id, name, display_name
```

### `run` <Badge type="default" text="^0.1" />

To run an AI Engine on actual plan's entity data.

The parameters that can be configured inside `run` tag are :

| Name     | Description                                                                                                                                                                                                                                                     | Metal version                        |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `ai`     | name of a declared AI Engine (see: [ai-engines](#ai-engines))                                                                                                                                                                                                   | <Badge type="default" text="^0.1" /> |
| `input`  | input field to perform the processing                                                                                                                                                                                                                           | <Badge type="default" text="^0.1" /> |
| `output` | Output result to be stored. If nothing is provided, the entire object will be stored in a field that has the AI Engine name. It accept a list of `key:value` where the `key` is a child of the result and the `value` is the renamed field in the plan's entity | <Badge type="default" text="^0.1" /> |

**Example**

```yaml
plans:
  my-plan:
    my-entity:
      - insert:
          data:
            - url: https://tesseract.projectnaptha.com/img/eng_bw.png
            - url: https://jeroen.github.io/images/testocr.png
            - url: https://www.srcmake.com/uploads/5/3/9/0/5390645/ocr_orig.png
      - run:
          ai: my-ocr
          input: url
          output:
            confidence: ocr_confidence
            text: ocr_text
```

### 📜`sync`⚡ <Badge type="default" text="^0.2" />

To synchronize data from source to destination. This will performs Update, Insert and Delete operations on the destination entity to be the exact copy of the data source.

The parameters that can be configured inside `sync` tag are :

| Name            | Description                                                                                                     | JS Context                                                                                   | Metal version                     |
| --------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------- |
| 📜`from.schema` | name of source schema. If not provided actual plan will be used as a schema                                     | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" /> |
| 📜`from.entity` | name of source entity in the `from.schema`                                                                      | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" /> |
| 📜`to.schema`   | name of destination schema. If not provided actual plan will be used as a schema                                | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" /> |
| 📜`to.entity`   | name of destination entity in the `to.schema`                                                                   | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" /> |
| 📜`id`          | field that exists in both source and destination entity. It will be used as unique identity for synchronization | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity) | <Badge type="info" text="^0.4" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Example**

```yaml
plans:
  my-plan:
    my-entity:
      - sync:
          from:
            schema: srcschema
            entity: users
          to:
            schema: destschema
            entity: users
          id: user_id
```

### `anonymize` <Badge type="default" text="^0.3" />

To anonymize data of given fields.

It can be unique field or a list of fields seperated with comma

**Example**

```yaml
plans:
  my-plan:
    my-entity:
      - anonymize: contact_name, company_name
```

### `remove-duplicates` <Badge type="default" text="^0.3" />

The `remove-duplicates` function is designed to remove duplicate rows from a dataset based on specified parameters. Here are the details:

| Parameters  | Type          | Required | Description                                                            | Metal version                        |
| ----------- | ------------- | -------- | ---------------------------------------------------------------------- | ------------------------------------ |
| `keys`      | Array(String) | No       | List of key(s) used for comparison (default: empty)                    | <Badge type="default" text="^0.3" /> |
| `method`    | String        | No       | Method of comparison (default: `hash`)                                 | <Badge type="default" text="^0.3" /> |
| `strategy`  | String        | No       | Strategy to adopt when duplicates are found (default: `first`)         | <Badge type="default" text="^0.3" /> |
| `condition` | String        | No       | Condition to apply according to the selected strategy (default: empty) | <Badge type="default" text="^0.3" /> |

**Parameters**

<u>keys</u><br/>

> An array of strings representing the keys to be used for identifying duplicates in the rows. If no keys are provided, the entire row will be considered for duplicate checking.

<u>method</u><br/>

> Defines the approach for comparing rows to identify duplicates. Options include:
>
> - `hash`: Uses a hash function to generate unique values for each row based on the specified key(s).
> - `exact`: Compares the specified key(s) directly to find exact matches.
> - `ignorecase`: Performs a case-insensitive comparison of the specified key(s).

<u>strategy</u><br/>

> Specifies the action to take when duplicates are identified. Possible values are:
>
> - `first`: Retains the first occurrence of each duplicate row.
> - `last`: Retains the last occurrence of each duplicate row.
> - `lowest`: Keeps the duplicate row with the lowest value in a specified field defined in `condition`.
> - `highest`: Keeps the duplicate row with the highest value in a specified field defined in `condition`.
> - `custom`: Applies a user-defined logic to decide which row to keep.

<u>condition</u><br/>

> Determines the condition to apply based on the chosen strategy.
>
> It can be:
>
> - For `lowest` and `highest`, the name of the field to evaluate.
> - For `custom`, a SQL predicate expression that defines the condition to retain the row (e.g., `age is not null and salary > 30000`).

These parameters provide flexible options for removing duplicates based on specific requirements and ensuring the integrity of the dataset.

**Example**

If we want to check duplicates with hash method for the rows that have the same `id`, `contact_name` adn then we keep the first row:

```yaml
plans:
  my-plan:
    my-entity:
      - remove-duplicates:
          keys: # <- fields in the row to be used for comparison
            - id
            - contact_name
          method: hash # <-  method of comparison
          strategy: first # <-  'first' for keeping the first found row
```

## `schedules` <Badge type="default" text="^0.1" />

This section defines the scheduled execution of plans according to a Cron expression.

The parameters that can be configured inside schedule are :

| Name     | Type   | Required | Description                                                            | Metal version                        |
| -------- | ------ | -------- | ---------------------------------------------------------------------- | ------------------------------------ |
| `plan`   | String | Y        | name of the plan                                                       | <Badge type="default" text="^0.1" /> |
| `entity` | String | Y        | name of the entity in the `plan`                                       | <Badge type="default" text="^0.1" /> |
| `cron`   | String | Y        | A cron expression string, or `@start` for once at Metal server startup | <Badge type="default" text="^0.1" /> |

**Example**

```yaml
schedules:
  run my-plan every 5 minutes:
    plan: my-plan
    entity: contact
    cron: "*/5 * * * * *"
```

::: tip ℹ️ TIP
By using `@start` as a cron expression, you can start the job once at Metal server startup.

Example:

```yaml
schedules:
  run at startup:
    plan: my-plan
    entity: contact
    cron: "@start"
```

:::
