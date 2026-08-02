---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

# Configuration File Reference

`config.yml` is the Metal configuration file, a YAML file used to configure sources, schemas, and plans.

**Example `config.yml`**

```yaml
version: "0.5"

server:
  port: 3000

sources:
  my-source:
    provider: postgres
    host: 127.0.0.1
    port: 5432
    user: myuser
    password: myStr@ngpa$$w0rd
    database: mydatabase

schemas:
  my-schema:
    source: my-source
```

## `version` <Badge type="default" text="v0.1+"/>

Defines the version used for the configuration.
Accepted values :
`0.5`

**Example:**

```yaml
version: "0.5"
```

## `server` <Badge type="default" text="v0.1+" />

Defines the configuration of the Metal server.

The parameters that can be configured inside the `server` section include:

| Parameter        | Type    | Required | Decription                                    | Metal version                         |
| ---------------- | ------- | -------- | --------------------------------------------- | ------------------------------------- |
| `authentication` | Object  | Y        | Configure user authentication                 | <Badge type="default" text="v0.3+" /> |
| `port`           | Integer | N        | Server TCP port (default: `3000`)             | <Badge type="default" text="v0.1+" /> |
| `timezone`       | String  | N        | Timezone setting (default: `UTC`)             | <Badge type="default" text="v0.1+" /> |
| `verbosity`      | String  | N        | Logging level (default: `warn`)               | <Badge type="default" text="v0.1+" /> |
| `cache`          | Object  | N        | Cache configuration(see: [sources](#sources)) | <Badge type="default" text="v0.1+" /> |
| `request-limit`  | String  | N        | Define request limit (default: `10mb`)        | <Badge type="default" text="v0.1+" /> |
| `response-limit` | String  | N        | Define response limit (default: `10mb`)       | <Badge type="default" text="v0.3+" /> |
| `response-rate`  | Object  | N        | Define response rate limit                    | <Badge type="default" text="v0.3+" /> |
| `endpoints`      | Object  | N        | Server endpoint toggles, including MCP        | <Badge type="info" text="v0.5+" /> |

**Example:**

```yaml
server:
  port: 3000
  verbosity: debug
  cache:
    provider: mongodb
    uri: mongodb://127.0.0.1:27017/
    database: metal_cache
    options:
      connectTimeoutMS: 5000
      serverSelectionTimeoutMS: 5000
```

### `port` <Badge type="default" text="v0.1+" />

Defines the Metal server's TCP port for API exposure.

Default: `3000`

### `verbosity` <Badge type="default" text="v0.1+" />

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

### `cache` <Badge type="default" text="v0.1+" />

Sets the Database server for storing cache objects. The configuration is the same as a source. (See: [sources](#sources))

This parameter must be configured if you plan to use the cache feature in Metal server.

::: warning ⚠️ IMPORTANT
Only the following cache providers are supported. Choose the one that matches your cache/storage backend:

- `postgres` — PostgreSQL
- `mysql` — MySQL
- `mssql` — Microsoft SQL Server
- `mongodb` — MongoDB
- `cosmosdb` — Azure Cosmos DB
- `metal` — Metal native storage
- `memory` — In-memory cache (non-persistent; for development/testing only)

Configure provider-specific connection settings in the `sources` section. 

Using `memory` will not persist data across restarts.
:::


### `timezone` <Badge type="default" text="v0.1+" />

Sets the server's timezone.

A list of acceptable timezone values can be found [here](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).

Default: `UTC`

### `authentication` <Badge type="default" text="v0.3+" />

Sets the authentication configuration for the Metal server.

The parameters that can be configured inside the `server` section include:

| Parameter      | Type         | Required | Decription                                                                                                | Metal version                         |
| -------------- | ------------ | -------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `provider`     | Enum(String) | Y        | Authentication Provider, defaults to `local` (see: [Authentication providers](#authentication-providers)) | <Badge type="default" text="v0.3+" /> |
| `default-role` | String       | N        | Default role assigned to the user when is authenticated, defaults empty. (see: [roles](#roles))           | <Badge type="default" text="v0.3+" /> |
| `autocreate`   | String       | N        | Populate automatically `users` with the authenticated user if not exist, defaults to `false`              | <Badge type="default" text="v0.3+" /> |

**Authentication providers** :

| Provider | Description                                                                      | Metal version                         |
| -------- | -------------------------------------------------------------------------------- | ------------------------------------- |
| `local`  | Enables local authentication through Metal server using declared [users](#users) | <Badge type="default" text="v0.3+" /> |
| `oidc`   | Enables OpenID Connect authentication with an external provider                  | <Badge type="default" text="v0.4+" /> |

**Example:**

```yaml
server:
  authentication:
    type: local
```

::: tip ℹ️ TIP
For more informations about authentication, roles and users, please refer to the [Authentication](../guides/authentication) guide.

:::

### `endpoints` <Badge type="info" text="v0.5+" />

Configures optional server endpoints.

The parameters that can be configured inside the `endpoints` section include:

| Parameter | Type | Required | Description | Metal version |
| --------- | ---- | -------- | ----------- | ------------- |
| `enable-mcp` | Boolean | N | Enables the MCP endpoint for exposing Metal tools to MCP clients | <Badge type="info" text="v0.5+" /> |

**Example:**

```yaml
server:
  endpoints:
    enable-mcp: true
```

### `request-limit` <Badge type="default" text="v0.1+" />

Controls the maximum request body size. If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the bytes library for parsing.
For supported values, see [here](https://www.npmjs.com/package/bytes).

When exeeded, an error PAYLOAD TOO LARGE(413) will occur.

Default: `10mb`

### `response-limit` <Badge type="default" text="v0.3+" />

Controls the maximum response body size. If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the bytes library for parsing.
For supported values, see [here](https://www.npmjs.com/package/bytes).

When exeeded, an error CONTENT TOO LARGE(413) will occur.

Default: `10mb`

### `response-rate` <Badge type="default" text="v0.3+" />

Controls the maximum request per window.
The parameters that can be configured inside the `response-rate` section include:

| Parameter  | Type    | Required | Description                                                                                                                                                                                                      | Metal version                         |
| ---------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `windowMs` | Integer | Y        | The time window for rate limiting, in milliseconds. For example, `60000` milliseconds (60 seconds).                                                                                                              | <Badge type="default" text="v0.3+" /> |
| `max`      | Integer | Y        | The maximum number of requests allowed within the `windowMs` time window. For example, `600` requests.                                                                                                           | <Badge type="default" text="v0.3+" /> |
| `message`  | String  | N        | The message to be sent when the rate limit is exceeded. This can be a custom message indicating that the user has made too many requests. For example, "Too many requests from this IP, please try again later." | <Badge type="default" text="v0.3+" /> |

If exeeded, an error TOO MANY REQUEST(429) will occur.

Default:

- windowMs: `60000`
- max: `600`
- message: `Too many requests from this IP, please try again later`

### `ai-engines` <Badge type="info" text="v0.5+" />

To enable AI capabilities in your Metal server, configure the following in your server configuration file:

**Example**

```yaml
server:
  # ... other server configurations ...
  ai-engines:
    timeout: 600000
    engines-url: http://127.0.0.1:5000
    params:
      host: "127.0.0.1" # or your machine IP
      port: 2375 # exposed from docker-compose
```

The parameters that can be configured inside the `ai-engines` section include:

| Parameter                 | Type    | Default Value                                 | Required | Description                                                                      | Metal Version                      |
| ------------------------- | ------- | --------------------------------------------- | -------- | -------------------------------------------------------------------------------- | ---------------------------------- |
| `params`                  | Object  |                                               | N        | Parameters for Container Provider. By default, local Docker daemon will be used. | <Badge type="info" text="v0.5+" /> |
| `build-batch-size`        | Integer | `5`                                           | N        | AI Engine Build batch size value.                                                | <Badge type="info" text="v0.5+" /> |
| `engines-url`             | URL     | `http://127.0.0.1:5000`                       | Y        | URL for AI Engine services.                                                      | <Badge type="info" text="v0.5+" /> |
| `timeout`                 | Integer | `60000`                                       | N        | Timeout for AI Engine requests in milliseconds.                                  | <Badge type="info" text="v0.5+" /> |
| `min-instance`            | Integer | `1`                                           | N        | Minimum number of AI Engine instances.                                           | <Badge type="info" text="v0.5+" /> |
| `max-instance`            | Integer | `5`                                           | N        | Maximum number of AI Engine instances.                                           | <Badge type="info" text="v0.5+" /> |
| `cpu-scale-up`            | Integer | `70`                                          | N        | Percentage of CPU used to trigger a scale up.                                    | <Badge type="info" text="v0.5+" /> |
| `cpu-scale-down`          | Integer | `30`                                          | N        | Percentage of CPU used to trigger a scale down.                                  | <Badge type="info" text="v0.5+" /> |
| `scale-interval`          | Integer | `15000`                                       | N        | AI Engine Scale interval value in milliseconds.                                  | <Badge type="info" text="v0.5+" /> |
| `scale-down-grace-period` | Integer | `300000`                                      | N        | Grace period before scaling down in milliseconds.                                | <Badge type="info" text="v0.5+" /> |
| `cpu`                     | Integer | `4`                                           | N        | CPU limit per AI Engine instances.                                               | <Badge type="info" text="v0.5+" /> |
| `memory`                  | Integer | `2`                                           | N        | Memory limit per AI Engine instances.                                            | <Badge type="info" text="v0.5+" /> |
| `cors`.`allowed-origins`  | String  | `*`                                           | N        | CORS allowed origins for AI Engine services.                                     | <Badge type="info" text="v0.5+" /> |
| `cors`.`allowed-methods`  | String  | `GET,POST,OPTIONS`                            | N        | CORS Allowed methods for AI Engine services.                                     | <Badge type="info" text="v0.5+" /> |
| `cors`.`allowed-headers`  | String  | `Content-Type,Authorization,X-Requested-With` | N        | CORS Allowed headers for AI Engine services.                                     | <Badge type="info" text="v0.5+" /> |

::: tip ℹ️ NOTE
For more detailed information about how to configure a Container Provider in `params`, See: [Container Provider Configurations](./container-provider-config)
:::

## `mcp` <Badge type="info" text="v0.5+" />

Configures MCP (Model Context Protocol) tools exposed by Metal. This allows LLM clients to call Metal schemas and entities through declarative YAML configuration.

To enable the MCP endpoint, set the following under the `server` section:

```yaml
server:
  endpoints:
    enable-mcp: true
```

The parameters that can be configured inside the `mcp` section include:

| Parameter             | Type   | Required | Description                                     | Metal version                      |
| --------------------- | ------ | -------- | ----------------------------------------------- | ---------------------------------- |
| `tools`               | Object | N        | Declarative MCP tools to expose                 | <Badge type="info" text="v0.5+" /> |
| `hide-sensitive-data` | Array  | N        | List of field names to hide from tool responses | <Badge type="info" text="v0.5+" /> |

### `tools`

Each entry under `tools` defines an MCP tool name. A tool maps to a schema entity and an action (`read`, `create`, `update`, `delete`, or `list`).

The parameters that can be configured inside each tool include:

| Parameter     | Type         | Required | Description                                                                 | Metal version                      |
| ------------- | ------------ | -------- | --------------------------------------------------------------------------- | ---------------------------------- |
| `description` | String       | Y        | Description shown to the LLM client                                         | <Badge type="info" text="v0.5+" /> |
| `schema`      | String       | Y        | Name of the schema to use                                                   | <Badge type="info" text="v0.5+" /> |
| `entity`      | String       | Y        | Name of the entity inside the schema (except for `list` actions)            | <Badge type="info" text="v0.5+" /> |
| `action`      | Enum(String) | N        | Tool action: `read`, `create`, `update`, `delete`, `list` (default: `read`) | <Badge type="info" text="v0.5+" /> |
| `roles`       | Array        | N        | Required roles for access to the tool                                       | <Badge type="info" text="v0.5+" /> |
| `cache`       | Integer      | N        | Cache duration in seconds for read operations                               | <Badge type="info" text="v0.5+" /> |
| `limit`       | Integer      | N        | Maximum number of rows to return (default: `10`)                            | <Badge type="info" text="v0.5+" /> |
| `fields`      | Array        | N        | Restrict the returned fields                                                | <Badge type="info" text="v0.5+" /> |
| `arguments`   | Object       | N        | Input arguments accepted by the tool                                        | <Badge type="info" text="v0.5+" /> |

### `arguments`

The parameters that can be configured inside each argument include:

| Parameter     | Type         | Required | Description                                                                 | Metal version                      |
| ------------- | ------------ | -------- | --------------------------------------------------------------------------- | ---------------------------------- |
| `type`        | Enum(String) | Y        | Argument type: `string`, `number`, `boolean`, `array`, or `object`         | <Badge type="info" text="v0.5+" /> |
| `description` | String       | Y        | Description shown to the LLM client                                         | <Badge type="info" text="v0.5+" /> |
| `map-to`      | String       | N        | Target field name in the schema entity for a single-field payload           | <Badge type="info" text="v0.5+" /> |
| `properties`  | Object       | N        | Nested properties for object arguments that should be remapped to many fields | <Badge type="info" text="v0.5+" /> |
| `required`    | Boolean      | N        | Whether the argument is required (default: `false`)                       | <Badge type="info" text="v0.5+" /> |
| `default`     | Any          | N        | Default value when the argument is omitted                                  | <Badge type="info" text="v0.5+" /> |
| `enum`        | Array        | N        | Restricts the allowed values                                                | <Badge type="info" text="v0.5+" /> |

For object arguments, use one of these two patterns:

- `map-to` only: the argument is treated as a single payload field and is mapped to one destination column.
- `properties` only: the argument is treated as a structured container and each nested property is mapped independently to one or many destination fields.

These two modes are mutually exclusive. A nested object cannot define both `map-to` and `properties` at the same time.

**Example: single-field object payload**

```yaml
mcp:
  tools:
    create_contact:
      description: Create a contact
      schema: crm
      entity: contact
      action: create
      arguments:
        contact:
          type: object
          description: Contact payload
          map-to: contact
```

**Example: structured object remapping**

```yaml
mcp:
  tools:
    create_contact:
      description: Create a contact
      schema: crm
      entity: contact
      action: create
      arguments:
        contact:
          type: object
          description: Contact details
          properties:
            first_name:
              type: string
              description: First name
              map-to: first_name
            company_name:
              type: string
              description: Company name
              map-to: company
```

**Example: sensitive data hiding**

```yaml
mcp:
  hide-sensitive-data:
    - password
    - secret
  tools:
    get_users:
      description: "Get list of users"
      schema: crm
      entity: users
      action: read
      limit: 50
      fields: [id, name, email]
      arguments:
        status:
          type: string
          required: false
          description: "Filter by status"
          map-to: user_status
```

::: tip ℹ️ NOTE
For practical guidance and additional examples, see [MCP Tools Guide](../guides/mcp-tools).
:::

## `roles` <Badge type="default" text="v0.3+" />

Sets the list of roles with associated permissions used when authentication is enabled with `server.authentication`. Each role is defined by a unique name and a string of permissions where each character represents a specific permission:

| Permission | Description             | Metal version                         |
| ---------- | ----------------------- | ------------------------------------- |
| `a`        | Administrate server     | <Badge type="default" text="v0.3+" /> |
| `l`        | List schema entities    | <Badge type="default" text="v0.3+" /> |
| `c`        | Create data in entities | <Badge type="default" text="v0.3+" /> |
| `r`        | Read data in entities   | <Badge type="default" text="v0.3+" /> |
| `u`        | Update data in entities | <Badge type="default" text="v0.3+" /> |
| `d`        | Delete data in entities | <Badge type="default" text="v0.3+" /> |

**Example:**

```yaml
roles:
  admin: arl           # admin,read,list
  all-rights: crudla   # all rights
  guest: r             # read only
```

## `users` <Badge type="info" text="v0.5+" />

Declares a list of Metal users used when authentication is enabled with `server.authentication`.

Each user entry is defined as an object containing:

| Parameter  | Type          | Required | Description                                                 | Metal version                         |
| ---------- | ------------- | -------- | ----------------------------------------------------------- | ------------------------------------- |
| `password` | String/Number | Y        | Password for the user account                               | <Badge type="default" text="v0.1+" /> |
| `secret`   | String        | N        | Optional secret value that can be used by the auth provider | <Badge type="info" text="v0.5+" />    |
| `roles`    | Array         | N        | Optional list of roles assigned to the user                 | <Badge type="info" text="v0.5+" />    |

**Example:**

```yaml
users:
  myapiuser:
    password: myStr@ngpa$$w0rd
  user1:
    password: pass
    roles:
      - admin
```

You can also define users with a simple scalar value, but the structured object form is the recommended format for compatibility with the current authentication schema.

## `sources` <Badge type="default" text="v0.1+" />

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

| Parameter  | Type         | Required | Decription             | Metal version                         |
| ---------- | ------------ | -------- | ---------------------- | ------------------------------------- |
| `provider` | Enum(String) | Y        | Provider type          | <Badge type="default" text="v0.1+" /> |
| `database` | String       | N        | Provider database      | <Badge type="info" text="v0.5+" />    |
| `host`     | String       | N        | Host server            | <Badge type="default" text="v0.1+" /> |
| `port`     | Integer      | N        | Host port              | <Badge type="default" text="v0.1+" /> |
| `user`     | String       | N        | Provider user          | <Badge type="default" text="v0.1+" /> |
| `password` | String       | N        | Provider user password | <Badge type="default" text="v0.1+" /> |
| `options`  | Object       | N        | Additional options     | <Badge type="default" text="v0.1+" /> |

### `provider` <Badge type="default" text="v0.1+" />

Defines the data provider type.

The table below describes the different values that can be configured in the `provider` parameter:

| Value      | DBMS Provider                            | Metal version                         |
| ---------- | ---------------------------------------- | ------------------------------------- |
| `postgres` | PostgreSQL                               | <Badge type="default" text="v0.1+" /> |
| `mssql`    | Azure Sql Database, Microsoft SQL Server | <Badge type="default" text="v0.1+" /> |
| `mongodb`  | MongoDB                                  | <Badge type="default" text="v0.1+" /> |
| `plans`    | Connect to Metal Plans                   | <Badge type="info" text="v0.5+" />    |
| `storage`  | Storage abstraction data provider        | <Badge type="info" text="v0.5+" />    |
| `metal`    | Metal Server via REST                    | <Badge type="default" text="v0.2+" /> |
| `memory`   | Local Memory storage (Non-persistant)    | <Badge type="default" text="v0.2+" /> |

For more detailed information about how to configure a data provider, See: [Data Providers Configurations](./data-providers-config)

**Example:**

If we want to declare a source named `my-postgresql-db` using the PostgreSQL data provider, we write:

```yaml
sources:
  my-postgresql-db:
    provider: postgres
```

### `host` <Badge type="default" text="v0.1+" />

Defines the DBMS server host.

**Example:**

```yaml
sources:
  my-postgresql-db:
    host: 10.11.12.13
```

::: warning ⚠️ IMPORTANT
For MongoDB, the host must be provided in the URI form `mongodb://my-server:my-server-port/`. Example: `mongodb://127.0.0.1:27017/`.
:::

::: tip ℹ️ NOTE
MS SQL Server can be provided in the form `MY-SERVER\MY-INSTANCE`.
:::

### `port` <Badge type="default" text="v0.1+" />

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

### `user` <Badge type="default" text="v0.1+" />

Defines the user to connect to the DBMS server.

**Example:**

```yaml
sources:
  my-postgresql-db:
    user: root
```

### `password` <Badge type="default" text="v0.1+" />

Defines the DBMS user password.

**Example:**

```yaml
sources:
  my-postgresql-db:
    password: MySecretPassword
```

### `database` <Badge type="default" text="v0.1+" />

Defines the name of the database to connect to.

**Example:**

```yaml
sources:
  my-postgresql-db:
    database: mydatabase
```

### `options` <Badge type="default" text="v0.1+" />

This parameter defines optional parameters to be passed to the data provider.

**Example:**

```yaml
sources:
  mongo-db1:
    provider: mongodb
    host: mongodb://127.0.0.1:27017/
    database: myDatabase
    options:
      connectTimeoutMS: 5000
      serverSelectionTimeoutMS: 5000
```

::: tip ℹ️ NOTE
For more information about how to configure a data provider and its options, See: [Data Providers Configurations](./data-providers-config)
:::

## `schemas` <Badge type="default" text="v0.1+" />

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

| Parameter   | Decription                        | Metal version                         |
| ----------- | --------------------------------- | ------------------------------------- |
| `source`    | Source to use                     | <Badge type="default" text="v0.1+" /> |
| `entities`  | Detailed entities configuration   | <Badge type="default" text="v0.1+" /> |
| `anonymize` | to anonymize data of given fields | <Badge type="default" text="v0.3+" /> |

### `source` <Badge type="default" text="v0.1+" />

Declare which source to use from the `sources` section. (See: [sources](#sources))

**Example:**

```yaml
schemas:
  my-schema1:
    source: my-mssql-db
```

### `entities` <Badge type="default" text="v0.1+" />

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
        source: my-plans
        entity: plan1
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

### `anonymize` <Badge type="default" text="v0.3+" />

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

## `plans` <Badge type="info" text="v0.5+" />

::: warning ⚠️ Breaking changes!
Plan structure has changed. Entity declarations have been removed. Plans now contain direct step declarations in `steps` parameter.
:::

This section is used to declare plans which are ETL steps.
Processing can be called on the fly by using a schema connected to a plan source; or by scheduling it as a job.

Each plan must declare at least one step under the `steps` key.

The parameters that can be configured inside `update` tag are :

| Name               | Type   | Required | Description                                                                | Metal version                      |
| ------------------ | ------ | -------- | -------------------------------------------------------------------------- | ---------------------------------- |
| `steps`            | Object | Y        | Section to declare plan's steps                                            | <Badge type="info" text="v0.5+" /> |
| `on-error`         | Object | N        | Error handling strategy when step fails (see: [on-error](on-error-yml)) | <Badge type="info" text="v0.5+" /> |
| `failure-strategy` | String | N        | Plan's output whene failure happen (default: `throw`)                      | <Badge type="info" text="v0.5+" /> |

**Example**

```yaml
plans:
  my-plan:
    steps:
      - select:
          schema: demo
          entity: users
          fields: login, partner_id
      - join:
          type: left
          entity: my-first-entity
          left-field: partner_id
          right-field: id
```

::: tip ℹ️ TIP
Steps are executed sequentially in the order they are declared. Each step can access data from previous steps.

**Example**

```yaml
plans:
  my-plan:
    steps:
      - select:
          schema: demo
          entity: users
          fields: id, name, display_name
      - join: # <-- join is performed on selected data from demo.users
          schema: demo
          entity: messages
          type: left
          left-field: id
          right-field: user_id
```

:::

### `on-error` <Badge type="info" text="v0.5+" />

::: note ℹ️ TIP
For detailed configuration, please see article [on-error](on-error-yml).
:::

### `failure-strategy` <Badge type="info" text="v0.5+" />

Defines how the plan behaves when a failure occurs:

- `data`: Returns only the data produced up to the step where the failure happened.
- `data-errors`: Returns the data produced up to the step where the failure happened, along with error details in metadata.
- `throw`: Halts execution and throws an error immediately when a failure occurs.

default: `throw`

### `steps` <Badge type="info" text="v0.5+" />

Steps that can be configured inside a plan are:

| Step command          | Decription                                                                                        | Metal version                         |
| --------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `select`              | Select data from a schema. If schema and entity are not provided, actual plan's data will be used | <Badge type="default" text="v0.1+" /> |
| `insert`              | Insert data to a schema. If schema and entity are not provided, actual plan's data will be used   | <Badge type="default" text="v0.1+" /> |
| `delete`              | Delete data from a schema. If schema and entity are not provided, actual plan's data will be used | <Badge type="default" text="v0.1+" /> |
| `update`              | Update data of a schema. If schema and entity are not provided, actual plan's data will be used   | <Badge type="default" text="v0.1+" /> |
| `list-entities`       | List entities in a schema.                                                                        | <Badge type="default" text="v0.3+" /> |
| `debug`               | Enable steps debug                                                                                | <Badge type="default" text="v0.1+" /> |
| `break`               | Stop plan execution at this step                                                                  | <Badge type="default" text="v0.1+" /> |
| `join`                | Perform data joins with actual plan's data (Left,Right,Inner,Full outer and Cross)                | <Badge type="default" text="v0.1+" /> |
| `sort`                | Sort actual data                                                                                  | <Badge type="info" text="v0.5+" />    |
| `run`                 | Run an AI tasks                                                                                   | <Badge type="default" text="v0.1+" /> |
| `sync`                | Synchronize data from data source to a data destination                                           | <Badge type="default" text="v0.2+" /> |
| `anonymize`           | Anonymize data of given fields                                                                    | <Badge type="default" text="v0.3+" /> |
| `remove-duplicates`   | Remove duplicated rows                                                                            | <Badge type="default" text="v0.3+" /> |
| `pick`                | Fields to keep from actual data                                                                   | <Badge type="info" text="v0.5+" />    |
| `omit`                | Remove fields from actual data                                                                    | <Badge type="info" text="v0.5+" />    |
| `map`                 | Rransform data using custom JavaScript code                                                       | <Badge type="info" text="v0.5+" />    |
| `set-var`             | Set persistent variables in the execution context                                                 | <Badge type="info" text="v0.5+" />    |
| `clear`               | Clear plan data, variables and reset execution context                                            | <Badge type="info" text="v0.5+" />    |
| `remove-empty-fields` | Remove fields with empty values (null, undefined, empty string, etc.)                             | <Badge type="info" text="v0.5+" />    |

#### `list-entities` 📜 <Badge type="default" text="v0.3+" />

To list entities in a schema.

The parameters that can be configured inside `select` tag are :

| Name        | Decription                                                                 | Metal version                      |
| ----------- | -------------------------------------------------------------------------- | ---------------------------------- |
| 📜`schema`   | name of schema                                                             | <Badge type="info" text="v0.5+" /> |
| 📜`on-error` | Error handling strategy when step fails (see: [on-error](on-error-yml)) | <Badge type="info" text="v0.5+" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Available context variables**

- [`$schema`](dynamic-expression-engine#schema)
- [`$vars`](dynamic-expression-engine#vars)
- [`$utils`](dynamic-expression-engine#utils)

**Example**

> ```yaml
> plans:
>   my-plan:
>     steps:
>       - list-entities:
>           schema: my-schema
> ```

#### `select` 📜 <Badge type="default" text="v0.1+" />

To select data from an entity.
If schema and entity are not provided, actual plan's data will be returned.

The parameters that can be configured inside `select` tag are :

| Name                 | Description                                                                                      | Metal version                      |
| -------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| 📜`schema`            | name of schema                                                                                   | <Badge type="info" text="v0.5+" /> |
| 📜`entity`            | name of entity in the `schema`                                                                   | <Badge type="info" text="v0.5+" /> |
| 📜`fields`            | fields to keep, comma seperated. (see: [Optional Parameters](rest-api#optional-parameters))      | <Badge type="info" text="v0.5+" /> |
| 📜`filter`            | condition `key:value` to filter data. (see: [Optional Parameters](rest-api#optional-parameters)) | <Badge type="info" text="v0.5+" /> |
| 📜`filter-expression` | free form condition to filter data. (see: [Optional Parameters](rest-api#optional-parameters))   | <Badge type="info" text="v0.5+" /> |
| 📜`sort`              | sort data, can be `asc` or `desc`. (see: [Optional Parameters](rest-api#optional-parameters))    | <Badge type="info" text="v0.5+" /> |
| 📜`cache`             | time in seconds to cache data. (see: [Optional Parameters](rest-api#optional-parameters))        | <Badge type="info" text="v0.5+" /> |
| 📜`on-error`          | Error handling strategy when step fails (see: [on-error](on-error-yml))                       | <Badge type="info" text="v0.5+" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Available context variables**

- [`$schema`](dynamic-expression-engine#schema)
- [`$entity`](dynamic-expression-engine#entity)
- [`$vars`](dynamic-expression-engine#vars)
- [`$utils`](dynamic-expression-engine#utils)

**Example**

> ```yaml
> plans:
>   my-plan:
>     steps:
>       - select:
>           schema: demo
>           entity: users
>           fields: login, partner_id
> ```

#### `insert` 📜 <Badge type="default" text="v0.1+" />

To insert data to an entity.
If schema and entity are not provided, actual plan's data will be modified

The parameters that can be configured inside `insert` tag are :

| Name        | Description                                                                                     | Metal version                      |
| ----------- | ----------------------------------------------------------------------------------------------- | ---------------------------------- |
| 📜`schema`   | name of schema                                                                                  | <Badge type="info" text="v0.5+" /> |
| 📜`entity`   | name of entity in the `schema`                                                                  | <Badge type="info" text="v0.5+" /> |
| 📜`data`     | data to be inserted in the `entity`. (see: [Optional Parameters](rest-api#optional-parameters)) | <Badge type="info" text="v0.5+" /> |
| 📜`on-error` | Error handling strategy when step fails (see: [on-error](on-error-yml))                      | <Badge type="info" text="v0.5+" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Available context variables**

- [`$schema`](dynamic-expression-engine#schema)
- [`$entity`](dynamic-expression-engine#entity)
- [`$vars`](dynamic-expression-engine#vars)
- [`$utils`](dynamic-expression-engine#utils)

**Example**

> ```yaml
> plans:
>   my-plan:
>     steps:
>       - insert:
>           schema: my-schema
>           entity: search-engine
>           data:
>             - name: Google
>               url: https://www.google.com
>             - name: Yahoo
>               url: https://www.yahoo.com
>             - name: Bing
>               url: https://www.bing.com
> ```

#### `delete` 📜 <Badge type="default" text="v0.1+" />

To delete data from an entity.
If schema and entity are not provided, actual plan's data will be modified

The parameters that can be configured inside `delete` tag are :

| Name                 | Description                                                                                      | Metal version                      |
| -------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| 📜`schema`            | name of schema                                                                                   | <Badge type="info" text="v0.5+" /> |
| 📜`entity`            | name of entity in the `schema`                                                                   | <Badge type="info" text="v0.5+" /> |
| 📜`filter`            | condition `key:value` to filter data. (see: [Optional Parameters](rest-api#optional-parameters)) | <Badge type="info" text="v0.5+" /> |
| 📜`filter-expression` | free form condition to filter data. (see: [Optional Parameters](rest-api#optional-parameters))   | <Badge type="info" text="v0.5+" /> |
| 📜`on-error`          | Error handling strategy when step fails (see: [on-error](on-error-yml))                       | <Badge type="info" text="v0.5+" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Available context variables**

- [`$schema`](dynamic-expression-engine#schema)
- [`$entity`](dynamic-expression-engine#entity)
- [`$vars`](dynamic-expression-engine#vars)
- [`$utils`](dynamic-expression-engine#utils)

**Example**

> ```yaml
> plans:
>   my-plan:
>     steps:
>       - delete:
>           schema: my-schema
>           entity: users
>           filter-expression: "id >= 100"
> ```

#### `update` 📜 <Badge type="default" text="v0.1+" />

To update data of an entity.
If schema and entity are not provided, actual plan's data will be modified

The parameters that can be configured inside `update` tag are :

| Name                 | Description                                                                                      | Metal version                      |
| -------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| 📜`schema`            | name of schema                                                                                   | <Badge type="info" text="v0.5+" /> |
| 📜`entity`            | name of entity in the `schema`                                                                   | <Badge type="info" text="v0.5+" /> |
| 📜`filter`            | condition `key:value` to filter data. (see: [Optional Parameters](rest-api#optional-parameters)) | <Badge type="info" text="v0.5+" /> |
| 📜`filter-expression` | free form condition to filter data. (see: [Optional Parameters](rest-api#optional-parameters))   | <Badge type="info" text="v0.5+" /> |
| 📜❇️`data`             | data to be inserted in the `entity`. (see: [Optional Parameters](rest-api#optional-parameters))  | <Badge type="info" text="v0.5+" /> |
| 📜`on-error`          | Error handling strategy when step fails (see: [on-error](on-error-yml))                       | <Badge type="info" text="v0.5+" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))
>
> ❇️: Supports Field Escape Engine (see: [Field Escape Engine](dynamic-expression-engine#field-escape-engine))

**Available context variables**

- [`$schema`](dynamic-expression-engine#schema)
- [`$entity`](dynamic-expression-engine#entity)
- [`$vars`](dynamic-expression-engine#vars)
- [`$utils`](dynamic-expression-engine#utils)

**Example**

> ```yaml
> plans:
>   my-plan:
>     steps:
>       - update:
>           schema: my-schema
>           entity: users
>           filter:
>             is_anonymized: true
>           data:
>             name: "******"
> ```

#### `debug` <Badge type="default" text="v0.1+" />

Enable plan steps debugging to be visible in the metadata of the JSON return.
It can be one of the following values :
nothing, `error`

**Example**

> ```yaml
> plans:
>   my-plan:
>     steps:
>       - debug:
> ```

#### `break` 📜 <Badge type="default" text="v0.1+" />

To stop execution of the plan at this step.
it accepts empty value or a JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Available context variables**

- [`$schema`](dynamic-expression-engine#schema)
- [`$entity`](dynamic-expression-engine#entity)
- [`$vars`](dynamic-expression-engine#vars)
- [`$utils`](dynamic-expression-engine#utils)

**Example with empty value**

> ```yaml
> plans:
>   my-plan:
>     steps:
>       - break:
> ```

**Example with JavaScript Expression Engine**

> ```yaml
> plans:
>   my-plan:
>     steps:
>       - break: ${{ $vars.myVar == true }}
> ```

#### `join` 📜 <Badge type="default" text="v0.1+" />

To perform data joins (Left,Right,Inner,Full outer and Cross)

The parameters that can be configured inside `join` tag are :

| Name           | Description                                                                | Metal version                      |
| -------------- | -------------------------------------------------------------------------- | ---------------------------------- |
| 📜`schema`      | Schema name to join with.                                                  | <Badge type="info" text="v0.5+" /> |
| 📜`entity`      | Entity name to join with                                                   | <Badge type="info" text="v0.5+" /> |
| 📜`type`        | Join type can be `left`,`right`,`inner`,`full-outer`,`cross`               | <Badge type="info" text="v0.5+" /> |
| 📜`left-field`  | Left field for equality with `right-field`                                 | <Badge type="info" text="v0.5+" /> |
| 📜`right-field` | Right field                                                                | <Badge type="info" text="v0.5+" /> |
| 📜`on-error`    | Error handling strategy when step fails (see: [on-error](on-error-yml)) | <Badge type="info" text="v0.5+" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Available context variables**

- [`$schema`](dynamic-expression-engine#schema)
- [`$entity`](dynamic-expression-engine#entity)
- [`$vars`](dynamic-expression-engine#vars)
- [`$utils`](dynamic-expression-engine#utils)

The `type` parameter can be :

| Value        | Description     | Metal version                         |
| ------------ | --------------- | ------------------------------------- |
| `left`       | Left Join       | <Badge type="default" text="v0.1+" /> |
| `right`      | Right Join      | <Badge type="default" text="v0.1+" /> |
| `inner`      | Inner Join      | <Badge type="default" text="v0.1+" /> |
| `full-outer` | Full Outer Join | <Badge type="default" text="v0.1+" /> |
| `cross`      | Cross Join      | <Badge type="default" text="v0.1+" /> |

**Example**

> ```yaml
> plans:
>   my-plan:
>     steps:
>       - select:
>           schema: demo
>           entity: users
>           fields: login, partner_id
>       - join:
>           schema: erp
>           entity: orders
>           type: left
>           left-field: partner_id
>           right-field: id
> ```

#### `sort` 📜 <Badge type="info" text="v0.5+" />

To sort actual plan's data.
Accept a list of one or many fields and sorting order :

- `asc` for ascending
- `desc` for descending

If sorting order is not provided, ascending order will be used.

| Parameter   | Type   | Required | Description                                                                   | Metal version                      |
| ----------- | ------ | -------- | ----------------------------------------------------------------------------- | ---------------------------------- |
| 📜`fields`   | Object | yes      | Mapping of fields to sort by, defined as `field: direction` (`asc` or `desc`) | <Badge type="info" text="v0.5+" /> |
| 📜`on-error` | Object | no       | Strategy to apply if the step fails (see: [on-error](on-error-yml))        | <Badge type="info" text="v0.5+" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Available context variables**

- [`$schema`](dynamic-expression-engine#schema)
- [`$entity`](dynamic-expression-engine#entity)
- [`$vars`](dynamic-expression-engine#vars)
- [`$utils`](dynamic-expression-engine#utils)

**Example**

> ```yaml
> plans:
>   my-plan:
>     steps:
>       - select:
>           schema: my-schema
>           entity: contacts
>           fields: id, name, display_name
>       - sort:
>           fields:
>             id: asc
>             name: desc
> ```

#### `pick` 📜 <Badge type="info" text="v0.5+" />

Select fields to keep and remove remaining from actual plan's data

| Parameters  | Type          | Required | Description                                                                | Metal version                      |
| ----------- | ------------- | -------- | -------------------------------------------------------------------------- | ---------------------------------- |
| 📜`fields`   | Array(String) | yes      | List of key(s) used for comparison                                         | <Badge type="info" text="v0.5+" /> |
| 📜`on-error` | Object        | no       | Error handling strategy when step fails (see: [on-error](on-error-yml)) | <Badge type="info" text="v0.5+" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Available context variables**

- [`$schema`](dynamic-expression-engine#schema)
- [`$entity`](dynamic-expression-engine#entity)
- [`$vars`](dynamic-expression-engine#vars)
- [`$utils`](dynamic-expression-engine#utils)

**Example**

> ```yaml
> plans:
>   my-plan:
>     steps:
>       - select:
>           schema: demo
>           entity: users
>       - pick:
>           fields:
>             - id
>             - name
>             - display_name
> ```

#### `omit` 📜 <Badge type="info" text="v0.5+" />

Select fields to remove from actual plan's data

| Parameters  | Type          | Required | Description                                                                | Metal version                      |
| ----------- | ------------- | -------- | -------------------------------------------------------------------------- | ---------------------------------- |
| 📜`fields`   | Array(String) | yes      | List of key(s) used for comparison                                         | <Badge type="info" text="v0.5+" /> |
| 📜`on-error` | Object        | no       | Error handling strategy when step fails (see: [on-error](on-error-yml)) | <Badge type="info" text="v0.5+" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Available context variables**

- [`$schema`](dynamic-expression-engine#schema)
- [`$entity`](dynamic-expression-engine#entity)
- [`$vars`](dynamic-expression-engine#vars)
- [`$utils`](dynamic-expression-engine#utils)

**Example**

> ```yaml
> plans:
>   my-plan:
>     steps:
>       - select:
>           schema: demo
>           entity: users
>       - omit:
>           fields:
>             - name
>             - display_name
> ```

#### `map` 📜 <Badge type="info" text="v0.5+" />

To transform data using custom JavaScript code. The script is executed for each row in the current data table, where `$row` represents the current row object.

The parameters that can be configured inside `map` tag are :

| Name        | Type   | Description                                                                  | Metal version                      |
| ----------- | ------ | ---------------------------------------------------------------------------- | ---------------------------------- |
| 📜`script`   | String | JavaScript code to transform each row                                        | <Badge type="info" text="v0.5+" /> |
| 📜`on-error` | Object | Error handling strategy when script fails (see: [on-error](on-error-yml)) | <Badge type="info" text="v0.5+" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Available context variables**

- [`$schema`](dynamic-expression-engine#schema)
- [`$entity`](dynamic-expression-engine#entity)
- [`$row`](dynamic-expression-engine#row)
- [`$vars`](dynamic-expression-engine#vars)
- [`$utils`](dynamic-expression-engine#utils)

**Example**

> ```yaml
> plans:
>   my-plan:
>     steps:
>       - select:
>           schema: demo
>           entity: products
>       - map:
>           script: |
>             $row.total = $row.price * $row.quantity;
>             $row.category = $row.category.toUpperCase();
>             return $row;
>           on-error:
>             scope: row
>             strategy: skip
> ```

In this example:

- Each row gets a new `total` field calculated as `price * quantity`
- The `category` field is converted to uppercase
- The modified row is returned
- If any row processing fails, that row is skipped and processing continues

::: warning ⚠️ IMPORTANT
The script:

- automatically includes a `return $row;` statement at the end if no explicit return statement is provided. This ensures that the modified row is returned and used further in the plan execution.
- must return a valid row object. If no valid object is returned, the original row will be used.
- is executed in a secure sandbox environment.
  :::

#### `set-var` 📜 <Badge type="info" text="v0.5+" />

To set persistent variables in the execution context that can be reused in subsequent steps.

The parameters that can be configured inside `set-var` tag are key-value pairs where:

- **key**: the name of the variable (accessible via `$vars.key` in expressions).
- **value**: the value to assign, which can be a literal or a JavaScript expression.

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Available context variables**

- [`$schema`](dynamic-expression-engine#schema)
- [`$entity`](dynamic-expression-engine#entity)
- [`$vars`](dynamic-expression-engine#vars)
- [`$utils`](dynamic-expression-engine#utils)

**Example**

> ```yaml
> plans:
>   steps:
>     - set-var:
>         base_url: "https://api.example.com"
>         threshold: ${{ 10 * 5 }}
>     - select:
>         schema: remote
>         entity: data
>         filter-expression: "value > ${{ $vars.threshold }}"
> ```

#### `run` 📜 <Badge type="info" text="v0.5+" />

To run an AI Task on actual plan's data.

The parameters that can be configured inside `run` tag are :

| Name        | Type   | Description                                                                | Metal version                      |
| ----------- | ------ | -------------------------------------------------------------------------- | ---------------------------------- |
| 📜`ai`       | String | AI Engine name (see: [AI Engines](ai-engines))                             | <Badge type="info" text="v0.5+" /> |
| 📜`task`     | String | AI Engine task (see: [AI Engines](ai-engines))                             | <Badge type="info" text="v0.5+" /> |
| 📜`params`   | Object | AI Engine parameters (see: [AI Engines](ai-engines))                       | <Badge type="info" text="v0.5+" /> |
| 📜`input`    | String | input field to perform the processing                                      | <Badge type="info" text="v0.5+" /> |
| 📜`output`   | Object | Output result to be stored. (see: output)                                  | <Badge type="info" text="v0.5+" /> |
| 📜`on-error` | Object | Error handling strategy when step fails (see: [on-error](on-error-yml)) | <Badge type="info" text="v0.5+" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Available context variables**

- [`$schema`](dynamic-expression-engine#schema)
- [`$entity`](dynamic-expression-engine#entity)
- [`$vars`](dynamic-expression-engine#vars)
- [`$utils`](dynamic-expression-engine#utils)
- [`$row`](dynamic-expression-engine#row) **(only in `input`)**
- [`$result`](dynamic-expression-engine#result) **(only in `output`)**

<u>**`output`**</u>

It can be:

- string representing the name of the field where the result will be stored
- a list of `key:value` where `key` is the mapped name of the field and `value` is the name of result property. In this configuration JavaScript Expression Engine is supported.

**Example**

> ```yaml
> plans:
>   steps:
>     - insert:
>         data:
>           - url: https://tesseract.projectnaptha.com/img/eng_bw.png
>           - url: https://jeroen.github.io/images/testocr.png
>           - url: https://www.srcmake.com/uploads/5/3/9/0/5390645/ocr_orig.png
>     - run:
>         ai: ocr
>         task: image-to-string
>         params:
>           lang: en_XX
>         input: content
>         output:
>           ocr_text: { { $result.ocr.text } } # stores the $result.ocr.text in the `ocr_text` field
>           ocr_lang_code: ${{ $result.ocr.lang.split('_')[0] }} # using JavaScript Expression Engine to transform result
> ```

#### `sync` 📜 <Badge type="info" text="v0.5+" />

To synchronize data from source to destination. This will performs Update, Insert and Delete operations on the destination entity to be the exact copy of the data source.

The parameters that can be configured inside `sync` tag are :

| Name           | Description                                                                                                     | Metal version                      |
| -------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 📜`from.schema` | name of source schema. If not provided actual plan will be used as a schema                                     | <Badge type="info" text="v0.5+" /> |
| 📜`from.entity` | name of source entity in the `from.schema`                                                                      | <Badge type="info" text="v0.5+" /> |
| 📜`to.schema`   | name of destination schema. If not provided actual plan will be used as a schema                                | <Badge type="info" text="v0.5+" /> |
| 📜`to.entity`   | name of destination entity in the `to.schema`                                                                   | <Badge type="info" text="v0.5+" /> |
| 📜`id`          | field that exists in both source and destination entity. It will be used as unique identity for synchronization | <Badge type="info" text="v0.5+" /> |
| 📜`on-error`    | Error handling strategy when step fails (see: [on-error](on-error-yml))                                      | <Badge type="info" text="v0.5+" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Available context variables**

- [`$schema`](dynamic-expression-engine#schema)
- [`$entity`](dynamic-expression-engine#entity)
- [`$vars`](dynamic-expression-engine#vars)
- [`$utils`](dynamic-expression-engine#utils)

**Example**

> ```yaml
> plans:
>   my-plan:
>     steps:
>       - sync:
>           from:
>             schema: src_schema
>             entity: users
>           to:
>             schema: dest_schema
>             entity: users
>           id: user_id
> ```

#### `anonymize` 📜 <Badge type="info" text="v0.5+" />

To anonymize data of given list of fields.

| Parameters  | Type          | Required | Description                                                                | Metal version                      |
| ----------- | ------------- | -------- | -------------------------------------------------------------------------- | ---------------------------------- |
| 📜`fields`   | Array(String) | yes      | List of key(s) used for comparison                                         | <Badge type="info" text="v0.5+" /> |
| 📜`on-error` | Object        | no       | Error handling strategy when step fails (see: [on-error](on-error-yml)) | <Badge type="info" text="v0.5+" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Available context variables**

- [`$schema`](dynamic-expression-engine#schema)
- [`$entity`](dynamic-expression-engine#entity)
- [`$vars`](dynamic-expression-engine#vars)
- [`$utils`](dynamic-expression-engine#utils)

**Example**

> ```yaml
> plans:
>   my-plan:
>     steps:
>       - anonymize:
>           fields:
>             - contact_name
>             - company_name
> ```

#### `remove-duplicates` 📜 <Badge type="info" text="v0.5+" />

The `remove-duplicates` function is designed to remove duplicate rows from a dataset based on specified parameters. Here are the details:

| Parameters   | Type          | Required | Description                                                                | Metal version                      |
| ------------ | ------------- | -------- | -------------------------------------------------------------------------- | ---------------------------------- |
| 📜`key`       | Array(String) | No       | List of fields used for comparison (default: empty)                        | <Badge type="info" text="v0.5+" /> |
| 📜`method`    | String        | No       | Method of comparison (default: `hash`)                                     | <Badge type="info" text="v0.5+" /> |
| 📜`strategy`  | String        | No       | Strategy to adopt when duplicates are found (default: `first`)             | <Badge type="info" text="v0.5+" /> |
| 📜`condition` | String        | No       | Condition to apply according to selected strategy (default: empty)         | <Badge type="info" text="v0.5+" /> |
| 📜`on-error`  | Object        | No       | Error handling strategy when step fails (see: [on-error](on-error-yml)) | <Badge type="info" text="v0.5+" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Available context variables**

- [`$schema`](dynamic-expression-engine#schema)
- [`$entity`](dynamic-expression-engine#entity)
- [`$vars`](dynamic-expression-engine#vars)
- [`$utils`](dynamic-expression-engine#utils)

**Parameters**

<u>key</u>

> An array of strings representing the key to be used for identifying duplicates in the rows. If no fields are provided, the entire row will be considered for duplicate checking.

<u>method</u>

> Defines the approach for comparing rows to identify duplicates. Options include:
>
> - `hash`: Uses a hash function to generate unique values for each row based on the specified key(s).
> - `exact`: Compares the specified key(s) directly to find exact matches.
> - `ignorecase`: Performs a case-insensitive comparison of the specified key(s).

<u>strategy</u>

> Specifies the action to take when duplicates are identified. Possible values are:
>
> - `first`: Retains the first occurrence of each duplicate row.
> - `last`: Retains the last occurrence of each duplicate row.
> - `lowest`: Keeps the duplicate row with the lowest value in a specified field defined in `condition`.
> - `highest`: Keeps the duplicate row with the highest value in a specified field defined in `condition`.
> - `custom`: Applies a user-defined logic to decide which row to keep.

<u>condition</u>

> Determines the condition to apply based on the chosen strategy.
>
> It can be:
>
> - For `lowest` and `highest`, the name of the field to evaluate.
> - For `custom`, a SQL predicate expression that defines the condition to retain the row (e.g., `age is not null and salary > 30000`).

These parameters provide flexible options for removing duplicates based on specific requirements and ensuring the integrity of the dataset.

**Example**

If we want to check duplicates with hash method for the rows that have the same `id`, `contact_name` adn then we keep the first row:

> ```yaml
> plans:
>   my-plan:
>     steps:
>       - remove-duplicates:
>           key: # <-- fields in the row to be used for comparison
>             - id
>             - contact_name
>           method: hash # <--  method of comparison
>           strategy: first # <--  'first' for keeping the first found row
> ```

#### `remove-empty-fields` 📜 <Badge type="info" text="v0.5+" />

Remove fields with empty values from data rows using flexible defaults + fields model.

This step removes fields that contain empty values according to configurable criteria. It supports both bulk cleanup (defaults on all fields) and surgical targeting (specific fields with custom rules).. Here are the details:

| Parameters  | Type   | Required | Description                                                                            | Metal version                      |
| ----------- | ------ | -------- | -------------------------------------------------------------------------------------- | ---------------------------------- |
| 📜`defaults` | Object | No       | List of criterion used for empty values testing. see Empty value criterion below       | <Badge type="info" text="v0.5+" /> |
| 📜`fields`   | Object | Yes      | List of field-specific criterion (overrides defaults). see Empty value criterion below | <Badge type="info" text="v0.5+" /> |
| 📜`on-error` | Object | No       | Error handling strategy when step fails (see: [on-error](on-error-yml))             | <Badge type="info" text="v0.5+" /> |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Available context variables**

- [`$schema`](dynamic-expression-engine#schema)
- [`$entity`](dynamic-expression-engine#entity)
- [`$vars`](dynamic-expression-engine#vars)
- [`$utils`](dynamic-expression-engine#utils)


<u>Empty value criterion</u>

| Criterion      | Default | Description                          | Examples to Remove                      |
| -------------- | ------- | ------------------------------------ | --------------------------------------- |
| `null`         | `false` | Remove `null` and `undefined` values | `null`, `undefined`                     |
| `empty-string` | `false` | Remove empty string `""`             | `""`                                    |
| `blank-string` | `false` | Remove whitespace-only strings       | `"   "`, `"\t\t"`, `"\n\n"`, `" \t\n "` |
| `string-null`  | `false` | Remove literal `"null"` string       | `"null"`                                |
| `zero`         | `false` | Remove numeric `0`                   | `0`                                     |
| `false`        | `false` | Remove boolean `false`               | `false`                                 |
| `empty-array`  | `false` | Remove empty arrays `[]`             | `[]`                                    |
| `empty-object` | `false` | Remove empty objects `{}`            | `{}`                                    |

<u>Processing Rules (in priority order)</u>

1. **defaults only**: Apply to ALL fields in every record
2. **fields map present**: Only listed fields are processed
3. **fields with empty config**: Use defaults for that field only
4. **fields with config**: Merge field config over defaults
5. **unlisted fields**: Skipped completely when fields map present
6. **no fields map**: Use defaults on all fields
7. **empty config**: No-op


**Example**

The step uses a flexible configuration model with `defaults` and optional `fields`:

> ```yaml
> remove-empty-fields:
>   defaults:
>     null: true # Remove null/undefined values
>     empty-string: true # Remove empty string ""
>     blank-string: true # Remove whitespace-only strings
>     string-null: false # Remove literal "null" string
>     zero: false # Remove numeric 0
>     false: false # Remove boolean false
>     empty-array: false # Remove empty arrays []
>     empty-object: false # Remove empty objects {}
>   fields:
>     numberOfCalls:
>       zero: true # Override defaults for this field
>     email: # Use defaults only
>     phone:
>       blank-string: true # Add extra rule to defaults
> ```



**Configuration Patterns**

> <u>Pattern 1: Clean ALL fields with standard rules</u>
> 
> Apply defaults to every field in all records:
> 
> ```yaml
> plans:
>   my-plan:
>     steps:
>       - remove-empty-fields:
>           defaults:
>             null: true
>             empty-string: true
>             blank-string: true
> ```
> 
> <u>Pattern 2: Clean only specific fields with defaults</u>
> 
> Process only listed fields using defaults:
> 
> ```yaml
> plans:
>   my-plan:
>     steps:
>       - remove-empty-fields:
>           defaults:
>             null: true
>             empty-string: true
>           fields:
>             email:
>             phone:
> ```
> 
> <u>Pattern 3: Defaults everywhere + field-specific overrides</u>
> 
> Apply defaults to all fields, with custom rules for specific fields:
> 
> ```yaml
> plans:
>   my-plan:
>     steps:
>       - remove-empty-fields:
>           defaults:
>             null: true
>             empty-string: true
>           fields:
>             retries:
>               zero: true
>             email:
> ```
> 
> <u>Pattern 4: Multiple rules per field</u>
> 
> Remove multiple empty value types for a single field:
> 
> ```yaml
> plans:
>   my-plan:
>     steps:
>       - remove-empty-fields:
>           defaults:
>             null: true
>           fields:
>             metadata:
>               empty-string: true
>               empty-object: true
> ```



#### `clear` <Badge type="info" text="v0.5+" />

Clear plan data, variables and reset execution context.

This step removes all data from the current plan, clears all variables, and resets the execution context to its initial state.

**Example**

> ```yaml
> plans:
>   my-plan:
>     steps:
>       - clear:
> ```

## `schedules` <Badge type="info" text="v0.5+" />

This section defines the scheduled execution of plans according to a Cron expression.

The parameters that can be configured inside schedule are :

| Name   | Type   | Required | Description                                       | Metal version                         |
| ------ | ------ | -------- | ------------------------------------------------- | ------------------------------------- |
| `plan` | String | Y        | name of the plan                                  | <Badge type="default" text="v0.1+" /> |
| `cron` | String | Y        | A cron expression string, or predefined schedules | <Badge type="default" text="v0.1+" /> |

**Example**

> ```yaml
> schedules:
>   run my-plan every 5 minutes:
>     plan: my-plan
>     cron: "*/5 * * * *"
> ```

The cron expression supports multiple formats:

- **Predefined schedules**: `@annually`, `@yearly`, `@monthly`, `@weekly`, `@daily`, `@hourly`, `@start`
- **Interval schedules**: `@every` followed by duration (e.g., `@every 1h30m`, `@every 2s`, `@every 500ms`)
- **Standard cron expressions**: 5-7 field cron format (e.g., `*/5 * * * *`, `0 9 * * 1-5`)

**Examples:**

> ```yaml
> schedules:
>   "run at startup":
>     plan: my-plan
>     cron: "@start"
>
>   "run every hour":
>     plan: my-plan
>     cron: "@hourly"
>
>   "run every 30 minutes":
>     plan: my-plan
>     cron: "@every 30m"
>
>   "run weekdays at 9 AM":
>     plan: my-plan
>     cron: "0 9 * * 1-5"
> ```
