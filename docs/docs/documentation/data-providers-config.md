---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

# Data Providers Configurations

These configurations define the setups required for connecting to various Data providers such as Microsoft SQL Server, PostgreSQL, MongoDB or files as data sources.

Each configuration specifies the necessary parameters such as host, port, user credentials, and additional options for optimal performance and security.

## Azure SQL Database <Badge type="info" text="v0.5+" />

**Primary parameters:**

| Parameter  | Type    | Required | Description                                                                          |
| ---------- | ------- | -------- | ------------------------------------------------------------------------------------ |
| `provider` | String  | Y        | Set to `mssql` for Azure SQL Database/Microsoft SQL Server                           |
| `host`     | String  | Y        | Server to connect to.                                                                |
| `port`     | Integer | N        | Port to connect to (default: 1433). Not to be set when connecting to named instance. |
| `user`     | String  | Y        | User name for authentication.                                                        |
| `password` | String  | Y        | Password for authentication.                                                         |
| `database` | String  | Y        | Database to connect to (default: dependent on server configuration).                 |

**Optional parameters:**

| Parameter                | Type    | Description                                                                              |
| ------------------------ | ------- | ---------------------------------------------------------------------------------------- |
| `domain`                 | String  | Domain for domain login to SQL Server.                                                   |
| `connectionTimeout`      | Integer | Connection timeout in milliseconds (default: 15000).                                     |
| `requestTimeout`         | Integer | Request timeout in milliseconds (default: 15000).                                        |
| `stream`                 | Boolean | Stream recordsets/rows instead of returning them all at once as an argument of callback. |
| `parseJSON`              | Boolean | Parse JSON recordsets to JS objects.                                                     |
| `arrayRowMode`           | String  | Return row results as an array instead of a keyed object.                                |
| `trustServerCertificate` | Boolean | Use `true` for local dev / self-signed certs.                                            |

**Example:**

```yaml
sources:
  my-az-db:
    provider: azure-sqldb
    host: mydbserver
    user: myuser
    password: myStr@ngpa$$w0rd
    database: mydatabase
```

## Azure Cosmos DB <Badge type="info" text="v0.5+" />

**Primary parameters:**

| Parameter  | Type   | Required | Description                                                                                 |
| ---------- | ------ | -------- | ------------------------------------------------------------------------------------------- |
| `provider` | String | Y        | Set to `azure-cosmosdb` for Azure Cosmos DB                                                 |
| `host`     | String | Y        | The endpoint URL of your Cosmos DB account (e.g., https://your-account.documents.azure.com) |
| `database` | String | Y        | The name of the database to connect to                                                      |

**Optional parameters:**

| Parameter          | Type    | Required | Description                                                                                                     |
| ------------------ | ------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `endpoint`         | String  | N        | The Cosmos DB endpoint URL (default: `""`)                                                                      |
| `key`              | String  | N        | The primary or secondary key for your Cosmos DB account                                                         |
| `partitionKey`     | String  | N        | The partition key path for the container                                                                        |
| `consistencyLevel` | String  | N        | Consistency level: `Strong`, `BoundedStaleness`, `Session`, `Eventual`, `ConsistentPrefix` (default: `Session`) |
| `retryAfter`       | Integer | N        | Time to wait between retries in milliseconds                                                                    |
| `autocreate`       | Boolean | N        | If set to `true`, container will be created automatically (default: `true`)                                     |
| `connectionPolicy` | Object  | N        | Connection policy settings, see: `connectionPolicy`                                                             |

<u>**connectionPolicy**</u>

Optional nested object for configuring the Cosmos DB client connection policy.

| Parameter                             | Type    | Required | Description                                                              |
| ------------------------------------- | ------- | -------- | ------------------------------------------------------------------------ |
| `requestTimeout`                      | Integer | N        | Request timeout in milliseconds (default: `5000`)                        |
| `maxRetryAttemptsOnThrottledRequests` | Integer | N        | Maximum number of retries for throttled requests                         |
| `maxRetryWaitTimeOnThrottledRequests` | Integer | N        | Maximum wait time in milliseconds between retries for throttled requests |
| `enableEndpointDiscovery`             | Boolean | N        | Enable endpoint discovery for multi-region accounts                      |
| `preferredLocations`                  | Array   | N        | List of preferred regions for multi-region Cosmos DB accounts            |

**Example:**

```yaml
sources:
  my-cosmosdb:
    provider: cosmosdb
    host: https://mycosmos.documents.azure.com
    database: mydatabase
    options:
      key: your-primary-key-here
      partitionKey: /id
      consistencyLevel: Session
      retryAfter: 1000
      autocreate: true
      connectionPolicy:
        requestTimeout: 5000
        connectionMode: Gateway
        maxRetryAttemptsOnThrottledRequests: 9
        maxRetryWaitTimeOnThrottledRequests: 30
        enableEndpointDiscovery: true
        preferredLocations:
          - "East US"
          - "West Europe"
```

## Microsoft SQL Server <Badge type="default" text="v0.1+" />

**Primary parameters:**

| Parameter  | Type    | Required | Description                                                                          |
| ---------- | ------- | -------- | ------------------------------------------------------------------------------------ |
| `provider` | String  | Y        | Set to `mssql` for Azure SQL Database/Microsoft SQL Server                           |
| `host`     | String  | Y        | Server to connect to.                                                                |
| `port`     | Integer | N        | Port to connect to (default: 1433). Not to be set when connecting to named instance. |
| `user`     | String  | Y        | User name for authentication.                                                        |
| `password` | String  | Y        | Password for authentication.                                                         |
| `database` | String  | Y        | Database to connect to (default: dependent on server configuration).                 |

**Optional parameters:**

| Parameter                | Type    | Description                                                                              |
| ------------------------ | ------- | ---------------------------------------------------------------------------------------- |
| `domain`                 | String  | Domain for domain login to SQL Server.                                                   |
| `connectionTimeout`      | Integer | Connection timeout in milliseconds (default: 15000).                                     |
| `requestTimeout`         | Integer | Request timeout in milliseconds (default: 15000).                                        |
| `stream`                 | Boolean | Stream recordsets/rows instead of returning them all at once as an argument of callback. |
| `parseJSON`              | Boolean | Parse JSON recordsets to JS objects.                                                     |
| `arrayRowMode`           | String  | Return row results as an array instead of a keyed object.                                |
| `encrypt`                | Boolean | Determining whether or not the connection will be encrypted (default: `true`)            |
| `trustServerCertificate` | Boolean | Use `true` for local dev / self-signed certs.                                            |

**Example:**

```yaml
sources:
  my-sql-db:
    provider: mssql
    host: mydbserver
    port: 1433
    user: sa
    password: myStr@ngpa$$w0rd
    database: mydatabase
    options:
      encrypt: false
      trustServerCertificate: true
      connectionTimeout: 15000
      requestTimeout: 15000
```

## PostgreSQL <Badge type="default" text="v0.1+" />

**Primary parameters:**

| Parameter  | Type    | Required | Description                                                          |
| ---------- | ------- | -------- | -------------------------------------------------------------------- |
| `provider` | String  | Y        | Set to `postgres` for PostgreSQL                                     |
| `host`     | String  | Y        | Server to connect to.                                                |
| `port`     | Integer | N        | Port to connect to (default: 5432).                                  |
| `user`     | String  | Y        | User name for authentication.                                        |
| `password` | String  | Y        | Password for authentication.                                         |
| `database` | String  | Y        | Database to connect to (default: dependent on server configuration). |

**Optional parameters:**

| Parameter                             | Type    | Description                                                                                                                                                                                        |
| ------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `connectionString`                    | String  | Connection string. Example:`postgres://user:password@host:5432/database`                                                                                                                           |
| `ssl`                                 | Object  | Options passed directly to`node.TLSSocket`. see: [TLS/SSL connections](https://node-postgres.com/features/ssl)                                                                                     |
| `types`                               | Object  | Custom type parsers.                                                                                                                                                                               |
| `statement_timeout`                   | Number  | Number of milliseconds before a statement in query will time out, default is no timeout.                                                                                                           |
| `query_timeout`                       | Number  | Number of milliseconds before a query call will timeout, default is no timeout.                                                                                                                    |
| `application_name`                    | String  | The name of the application that created this Client instance.                                                                                                                                     |
| `connectionTimeoutMillis`             | Number  | Number of milliseconds to wait for connection, default is no timeout.                                                                                                                              |
| `idle_in_transaction_session_timeout` | Number  | Number of milliseconds before terminating any session with an open idle transaction, default is no timeout.                                                                                        |
| `idleTimeoutMillis`                   | Number  | Number of milliseconds a client must sit idle in the pool and not be checked out before it is disconnected, default is 10000 (10 seconds). Set to 0 to disable auto-disconnection of idle clients. |
| `max`                                 | Number  | Maximum number of clients the pool should contain, default is 10.                                                                                                                                  |
| `allowExitOnIdle`                     | Boolean | Setting`true` allows the node event loop to exit as soon as all clients in the pool are idle. Default is`true`.                                                                                    |

**Example:**

```yaml
sources:
  my-postgres-db:
    provider: postgres
    host: mydbserver
    port: 5432
    user: admin
    password: myStr@ngpa$$w0rd
    database: mydatabase
    options:
      connectionTimeoutMillis: 30000
      idleTimeoutMillis: 10000
      max: 10
      allowExitOnIdle: true
```

## MongoDB <Badge type="default" text="v0.1+" />

**Primary parameters:**

| Parameter  | Type   | Required | Description                                                          |
| ---------- | ------ | -------- | -------------------------------------------------------------------- |
| `provider` | String | Y        | Set to `mongodb` for MongoDB                                         |
| `host`     | String | Y        | URI to connect to.                                                   |
| `database` | String | Y        | Database to connect to (default: dependent on server configuration). |

**Optional parameters:**

| Parameter               | Type    | Description                                                                                                                                                                                                                                                                |
| ----------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `connectTimeoutMS`      | Integer | Specifies the number of milliseconds to wait before timeout on a TCP connection. (default: `30000`)                                                                                                                                                                        |
| `directConnection`      | Boolean | Specifies whether to force dispatch all operations to the host specified in the connection URI. (default: `false`)                                                                                                                                                         |
| `family`                | Number  | Specifies the version of the Internet Protocol (IP). Valid values are: 4, 6, 0, or null. 0 and null settings attempt to connect with IPv6 and fall back to IPv4 upon failure. (default: `null`)                                                                            |
| `forceServerObjectId`   | Boolean | Specifies whether to force the server to assign \_id values to documents instead of the driver. (default: `false`)                                                                                                                                                         |
| `ignoreUndefined`       | Boolean | Specifies whether the BSON serializer should ignore undefined fields. (default: `false`)                                                                                                                                                                                   |
| `keepAlive`             | Boolean | Specifies whether to enable keepAlive on the TCP socket. (default: `true`)                                                                                                                                                                                                 |
| `keepAliveInitialDelay` | Integer | Specifies the number of milliseconds to wait before initiating keepAlive on the TCP socket. (default: `120000`)                                                                                                                                                            |
| `maxPoolSize`           | Integer | Specifies the maximum number of connections that a connection pool may have at a given time. (default: `100`)                                                                                                                                                              |
| `maxIdleTimeMS`         | Integer | Specifies the maximum amount of time a connection can remain idle in the connection pool before being removed and closed. (default: `∞`)                                                                                                                                   |
| `minPoolSize`           | Integer | Specifies the minimum number of connections that must exist at any moment in a single connection pool. (default: `0`)                                                                                                                                                      |
| `noDelay`               | Boolean | Specifies whether to use the TCP socket no-delay option. (default: `true`)                                                                                                                                                                                                 |
| `socketTimeoutMS`       | Integer | Specifies the number of milliseconds to wait before timeout on a TCP socket. (default: `360000`)                                                                                                                                                                           |
| `tls`                   | Boolean | Specifies whether to establish a Transport Layer Security (TLS) connection with the instance. This is automatically set to true when using a DNS seedlist (SRV) in the connection string. You can override this behavior by setting the value to false. (default: `false`) |
| `waitQueueTimeoutMS`    | Integer | Specifies the maximum amount of time in milliseconds that operation execution can wait for a connection to become available. (default: `0`)                                                                                                                                |

**Example:**

```yaml
sources:
  my-mongodb-db:
    provider: mongodb
    host: mongodb://my-mongodb-server:27017/
    database: my-database
    options:
      maxIdleTimeMS: 15000
      connectTimeoutMS: 5000
```

## MySql <Badge type="default" text="v0.4+" />

The MySql data provider is used to connect to a MySql database. It supports various parameters to customize the connection and data retrieval.

**Primary parameters:**

| Parameter  | Type    | Required | Description                                |
| ---------- | ------- | -------- | ------------------------------------------ |
| `provider` | String  | Y        | Set to `mysql` for MySql data provider     |
| `host`     | String  | Y        | Server to connect to (default: 127.0.0.1). |
| `port`     | Integer | N        | Port to connect to (default: 3306).        |
| `user`     | String  | Y        | User name for authentication.              |
| `password` | String  | Y        | Password for authentication.               |
| `database` | String  | Y        | Database to connect to.                    |

**Optional parameters:**

| Parameter               | Type    | Required | Description                                                                                                                                                                                                                                                             |
| ----------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `waitForConnections`    | Boolean | N        | Determines the pool's action when no connections are available and the limit has been reached. If true, the pool will queue the connection request and call it when one becomes available. If false, the pool will immediately call back with an error. (Default: true) |
| `connectionLimit`       | Number  | N        | The maximum number of connections to create at once. (Default: 10)                                                                                                                                                                                                      |
| `maxIdle`               | Number  | N        | The maximum number of idle connections. (Default: same as `connectionLimit`)                                                                                                                                                                                            |
| `idleTimeout`           | Number  | N        | The idle connections timeout, in milliseconds. (Default: 60000)                                                                                                                                                                                                         |
| `queueLimit`            | Number  | N        | The maximum number of connection requests the pool will queue before returning an error from getConnection. If set to 0, there is no limit to the number of queued connection requests. (Default: 0)                                                                    |
| `enableKeepAlive`       | Boolean | N        | Enable keep-alive on the socket. (Default: true)                                                                                                                                                                                                                        |
| `keepAliveInitialDelay` | Number  | N        | Sets the initial delay (in milliseconds) before sending the first TCP keepalive probe on an idle socket. (Default: 0)                                                                                                                                                   |

**Example:**

```yaml
sources:
  my-mysql-db:
    provider: mysql
    host: mydbserver
    port: 3306
    user: root
    password: myStr@ngpa$$w0rd
    database: mydatabase
    options:
      waitForConnections: true
      connectionLimit: 10
      maxIdle: 10
      idleTimeout: 60000
      queueLimit: 0
      enableKeepAlive: true
      keepAliveInitialDelay: 0
```

## Memory <Badge type="default" text="v0.2+" />

Non-persistent Memory Database

**Primary parameters:**

| Parameter  | Type   | Required | Description                                 |
| ---------- | ------ | -------- | ------------------------------------------- |
| `provider` | String | Y        | Set to `memory` for In memory data provider |

**Optional parameters:**

| Parameter    | Type    | Required | Description                                                               |
| ------------ | ------- | -------- | ------------------------------------------------------------------------- |
| `autocreate` | Boolean | N        | if set to `true`, entity will be created automatically (default: `false`) |

**Example:**

```yaml
sources:
  my-memory:
    provider: memory
    options:
      autocreate: true
```

## Fake Data <Badge type="info" text="v0.5+" />

The Fake Data provider generates deterministic synthetic records for testing ETL Plans, MCP Tools, and schemas without external databases.

**Primary parameters:**

| Parameter  | Type   | Required | Description                               |
| ---------- | ------ | -------- | ----------------------------------------- |
| `provider` | String | Y        | Set to `fake-data` for Fake Data provider |

**Optional parameters:**

| Parameter    | Type    | Required | Description                                                                                                                                                                        |
| ------------ | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `seed`       | Integer | N        | Set the seed to ensures reproducible generation (default: random integer).<br/><br/>**ℹ️ Please note that generated values are dependent on both the seed and the number of rows.** |
| `autocreate` | Boolean | N        | If set to `true`, selecting an undefined entity creates an empty table (default: `true`).                                                                                          |

**Entity properties:**

| Parameter | Type    | Required | Description                                                                                                                      |
| --------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `locale`  | String  | N        | Faker locale for this entity (e.g. `en_EN`, `fr_FR`), default: `en_EN`. See Available locales above.                             |
| `rows`    | Integer | N        | Number of records generated per entity, default: `100`. Must be ≥ 0.                                                             |
| `fields`  | Object  | N        | Field definitions. Keys are field names, values are faker expression strings. When omitted, entity is an empty dynamic document. |

**Faker expression format:**

Each field value is a faker function. Examples:

- `string.uuid()` → generates UUID string
- `number.int({ min: 10, max: 100 })` → generates integer from 10 to 100
- `person.firstName('male')` → generates male's first name

For more details about how to use data types, see [FakerJS API](https://fakerjs.dev/api/)

::: warning ⚠️ IMPORTANT
If a Faker function is not available for the specified locale, it silently falls back to the English locale, `en_EN`.
:::

**Example:**

```yaml
sources:
  fake-crm:
    provider: fake-data
    options:
      seed: 42
      entities:
        customers:
          locale: en_EN
          rows: 100
          fields:
            id: string.uuid()
            firstName: person.firstName()
            lastName: person.lastName()
            email: internet.email()
            age: "number.int({ min: 18, max: 80 })"
            active: datatype.boolean()
            createdAt: date.anytime()
        books:
          locale: fr_FR
          rows: 45
          fields:
            id: string.uuid()
            title: "person.firstName('male')"
            author: person.lastName()
            publishedAt: date.anytime()
```

**Available locales:** Afrikaans (`af_ZA`), Arabic (`ar_AR`), Azerbaijani (`az_AZ`), Bengali (`bn_BD`), Czech (`cs_CZ`), Welsh (`cy_CY`), Danish (`da_DA`), German (`de_DE`, `de_AT`, `de_CH`), Divehi (`dv_DV`), Greek (`el_EL`), English (`en_EN`, `en_US`, `en_AU`, `en_BORK`, `en_CA`, `en_GB`, `en_GH`, `en_HK`, `en_IE`, `en_IN`, `en_NG`, `en_ZA`), Esperanto (`eo_EO`), Spanish (`es_ES`, `es_MX`), Persian (`fa_FA`), Finnish (`fi_FI`), French (`fr_FR`, `fr_BE`, `fr_CA`, `fr_CH`, `fr_LU`, `fr_SN`), Hebrew (`he_HE`), Croatian (`hr_HR`), Hungarian (`hu_HU`), Armenian (`hy_HY`), Indonesian (`id_ID`), Italian (`it_IT`), Japanese (`ja_JA`), Georgian (`ka_GE`), Korean (`ko_KO`), Latvian (`lv_LV`), Macedonian (`mk_MK`), Norwegian Bokmål (`nb_NO`), Nepali (`ne_NE`), Dutch (`nl_NL`, `nl_BE`), Polish (`pl_PL`), Portuguese (`pt_PT`, `pt_BR`), Romanian (`ro_RO`, `ro_MD`), Russian (`ru_RU`), Slovak (`sk_SK`), Serbian (`sr_RS`), Swedish (`sv_SV`), Tamil (`ta_IN`), Thai (`th_TH`), Turkish (`tr_TR`), Ukrainian (`uk_UK`), Urdu (`ur_UR`), Uzbek (`uz_UZ`), Vietnamese (`vi_VI`), Yoruba (`yo_NG`), Chinese (Simplified) (`zh_CN`), Chinese (Traditional) (`zh_TW`), Zulu (`zu_ZA`).


## Plans <Badge type="info" text="v0.5+" />

Used to connect to Metal ETL Plans

**Parameters:**

| Parameter  | Type   | Required | Description             |
| ---------- | ------ | -------- | ----------------------- |
| `provider` | String | Y        | Set to `plans` for plan |

**Example:**

```yaml
sources:
  my-plan-source:
    provider: plans
```

## Remote Metal Server <Badge type="default" text="v0.2+" />

This is used to connect to a remote instance of Metal Server

**Primary parameters:**

| Parameter  | Type   | Required | Description                                   |
| ---------- | ------ | -------- | --------------------------------------------- |
| `provider` | String | Y        | Set to `metal` for Metal Server               |
| `host`     | String | Y        | URL of the target server to connect to        |
| `user`     | String | Y        | User name for authentication.                 |
| `password` | String | Y        | Password for authentication.                  |
| `database` | String | Y        | Name of the schema on the remote Metal server |

**Example:**

```yaml
sources:
  my-metal-schema:
    provider: metal
    host: http://metalserver:3001
    user: myapiuser
    password: myStr@ngpa$$w0rd
    database: myschema
```

## Storage <Badge type="info" text="v0.5+" />

The Storage data provider allows you to manage file-based data or folders content as data.
It provides a flexible solution to handle various content types and storage options.

when using parameter `options.storage-mode` you can switch between 2 modes :

- `files`: to work with files as data
- `folders`: to work with folders as data

**Example:**

Working with Filesystem storage with CSV content as data:

```yaml
sources:
  my-files:
    provider: storage
    options:
      storage-mode: files
      storage-type: fs
      folder: ./data/
      content:
        "*.csv":
          content-type: csv
          csv-delimiter: ","
          csv-newline: "\n"
          csv-header: true
          csv-quote: '"'
```

**Primary parameters:**

| Parameter  | Type   | Required | Description                              |
| ---------- | ------ | -------- | ---------------------------------------- |
| `provider` | String | Y        | Set to `storage` for Files data provider |

### `storage-mode`

mode can be set using `options.storage-mode`

#### `folders`

The `folders` mode enables handle folders as data, returning subfolders as entities and contained files as entity data.

**Optional parameters:**

| Parameter      | Type    | Required | Description                                                                                                                                      |
| -------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `storage-mode` | String  | Y        | Set to `folders` to work with folders as data                                                                                                    |
| `storage-type` | String  | Y        | The storage where the files are stored, see: [Storage Types](#storage-types)                                                                     |
| `autocreate`   | Boolean | N        | if set to `true`, when interacting with entities that do not exist, files with same entity name will be created automatically (default: `false`) |
| `allow-delete` | Boolean | N        | if set to `true`, allow deleting entities (default: `false`)                                                                                     |

Data returned from folders mode are:

| Property     | Type     | Description                                                                                               |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------- |
| `name`       | `string` | The name of the file.                                                                                     |
| `mimeType`   | `string` | The mime type of the file.                                                                                |
| `type`       | `string` | The type of the file.                                                                                     |
| `size`       | `number` | The size of the file in bytes.                                                                            |
| `createdAt`  | `date`   | The creation date of the file. (ISO 8601 format)                                                          |
| `modifiedAt` | `date`   | The modification date of the file. (ISO 8601 format)                                                      |
| `path`       | `string` | The path of the file.                                                                                     |
| `content`    | `string` | The Base64 content of the file. ❗By default it is not returned unless you specify it explicitly in fields |


**Example:**

Working with Filesystem storage:

```yaml
sources:
  src-fs:
    provider: storage
    options:
      storage-mode: folders
      storage-type: fs
      folder: ./data/
      allow-delete: true
```

::: warning ⚠️ IMPORTANT
By Default, the `content` field is not returned unless you specify it explicitly for example in `select.fields`.

> ```yaml
> plans:
>   myplan:
>     steps:
>       - select:
>           schema: fs
>           entity: images
>           fields: "*,content"
> ```

:::
::: tip ℹ️ NOTE
When you perform Insert and Update, only fields `name` and `content` can be modified.
:::

#### `files`

The `files` mode enables treating files as data. Files content is returned as data.
Files can be in various formats such as JSON, CSV, XLSX, etc.
Each file can have its own associated content type with optional parameters for customizing the content type settings.

**Optional parameters:**

| Parameter      | Type    | Required | Description                                                                                                                                                                                     |
| -------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage-mode` | String  | Y        | Set to `files` to work with files as data                                                                                                                                                       |
| `storage-type` | String  | Y        | The storage where the files are stored, see: [Storage Types](#storage-types)                                                                                                                    |
| `content`      | Object  | Y        | Contains pattern of files and associated content type, including JSON, CSV, and XLSX, with optional parameters for customizing the content type settings., see: [Content Types](#content-types) |
| `autocreate`   | Boolean | N        | if set to `true`, when interacting with entities that do not exist, files with same entity name will be created automatically (default: `false`)                                                |

**Example:**

Working with *.json files on Filesystem storage:

```yaml
sources:
  src-json:
    provider: storage
    options:
      storage-mode: files
      storage-type: fs
      folder: ../data
      autocreate: true
      content:
        "*.json":
          content-type: json
          json-path: rows
```

### `storage-type` <Badge type="default" text="v0.3+" />

Storage types can be set with the parameter `options.storage` as shown in the example below:

```yaml
sources:
  my-files:
    provider: storage
    options:
      storage-mode: files
      storage-type: fs
      folder: ./data/
      …
```

List of managed storage types:

| Parameter        | Description                  | Metal version                         |
| ---------------- | ---------------------------- | ------------------------------------- |
| `azure-blob`     | Azure Blob Storage           | <Badge type="info" text="v0.5+" />    |
| `azure-file`     | Azure File Share             | <Badge type="info" text="v0.5+" />    |
| `azure-datalake` | Azure Data Lake Storage Gen2 | <Badge type="info" text="v0.5+" />    |
| `aws-s3`         | Amazon S3                    | <Badge type="info" text="v0.5+" />    |
| `fs`             | Local file system            | <Badge type="default" text="v0.3+" /> |
| `ftp`            | FTP server                   | <Badge type="default" text="v0.3+" /> |
| `sftp`           | SFTP server                  | <Badge type="info" text="v0.5+" />    |

#### `azure-blob` (Azure Blob Storage) <Badge type="info" text="v0.5+" />

This refers to use a Azure Blob Storage

**Optional Parameters:**

| Parameter           | Type   | Required | Description                                                                                  |
| ------------------- | ------ | -------- | -------------------------------------------------------------------------------------------- |
| `storage-type`      | String | Y        | Set to `azure-blob` for Azure Blob Storage                                                   |
| `connection-string` | String | Y        | Azure Blob Connection String                                                                 |
| `container`         | String | Y        | Azure Blob Container name                                                                    |
| `autocreate`        | String | N        | If set to `true` then the container will be created with the provided name, default: `false` |

**Example:**

```yaml
sources:
  my-azure-blob-files:
    provider: storage
    options:
      storage-mode: files  
      storage-type: azure-blob    # [!code highlight]
      connection-string: DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=accountKey;EndpointSuffix=core.windows.net    # [!code highlight]
      container: datacontainer1    # [!code highlight]
      autocreate: true    # [!code highlight]
      …
```

#### `azure-file` (Azure File Share) <Badge type="info" text="v0.5+" />

This refers to use an Azure File Share storage.

**Optional Parameters:**

| Parameter           | Type    | Required | Description                                                              |
| ------------------- | ------- | -------- | ------------------------------------------------------------------------ |
| `storage-type`      | String  | Y        | Set to `azure-file` for Azure File Share                                 |
| `connection-string` | String  | Y        | Azure Storage connection string                                          |
| `share-name`        | String  | Y        | Azure File Share name                                                    |
| `folder`            | String  | N        | Remote folder in the share, default: `/`                                 |
| `autocreate`        | Boolean | N        | if set to `true`, entity will be created automatically, default: `false` |

**Example:**

```yaml
sources:
  my-azure-file-files:
    provider: storage
    options:
      storage-mode: files
      storage-type: azure-file    # [!code highlight]
      connection-string: "DefaultEndpointsProtocol=https;AccountName=mystorageaccount;AccountKey=accountkey;EndpointSuffix=core.windows.net"    # [!code highlight]
      share-name: myshare    # [!code highlight]
      folder: /path/to/files    # [!code highlight]
```

#### `azure-datalake` (Azure Data Lake Storage Gen2) <Badge type="info" text="v0.5+" />

This refers to use Azure Data Lake Storage Gen2

**Required Parameters:**

| Parameter           | Type    | Required | Description                                                              |
| ------------------- | ------- | -------- | ------------------------------------------------------------------------ |
| `storage-type`      | String  | Y        | Set to `azure-datalake` for Azure Data Lake Storage Gen2                 |
| `connection-string` | String  | Y        | Azure Storage connection string                                          |
| `container`         | String  | Y        | Name of the container to store files in                                  |
| `autocreate`        | Boolean | N        | if set to `true`, entity will be created automatically, default: `false` |

**Example:**

```yaml
sources:
  my-azure-datalake-files:
    provider: storage
    options:
      storage-mode: files
      storage-type: azure-datalake    # [!code highlight]
      connection-string: "DefaultEndpointsProtocol=https;AccountName=mystorageaccount;AccountKey=accountkey;EndpointSuffix=core.windows.net"    # [!code highlight]
      container: mycontainer    # [!code highlight]
      autocreate: true    # [!code highlight]
      …
```

#### `aws-s3` (Amazon S3) <Badge type="info" text="v0.5+" />

This refers to use Amazon S3 storage

**Required Parameters:**

| Parameter           | Type    | Required | Description                                                                 |
| ------------------- | ------- | -------- | --------------------------------------------------------------------------- |
| `storage-type`      | String  | Y        | Set to `aws-s3` for Amazon S3 storage                                       |
| `region`            | String  | Y        | AWS region where the S3 bucket is located                                   |
| `bucket`            | String  | Y        | Name of the S3 bucket to store files in                                     |
| `access-key-id`     | String  | N        | AWS access key ID for authentication (optional, can use IAM roles)          |
| `secret-access-key` | String  | N        | AWS secret access key for authentication (optional, can use IAM roles)      |
| `endpoint`          | String  | N        | Optional endpoint URL for S3-compatible services (default: AWS S3 endpoint) |
| `profile`           | String  | N        | AWS profile name for authentication (optional)                              |
| `autocreate`        | Boolean | N        | if set to `true`, entity will be created automatically, default: `false`    |

**Example:**

```yaml
sources:
  my-s3-files:
    provider: storage
    options:
      storage-mode: files
      storage-type: aws-s3    # [!code highlight]
      region: us-east-1    # [!code highlight]
      bucket: your-bucket-name    # [!code highlight]
      access-key-id: your-access-key-id      # [!code highlight]
      secret-access-key: your-secret-access-key      # [!code highlight]
      endpoint: http://127.0.0.1:9000      # [!code highlight]
      profile: my-aws-profile      # [!code highlight]
      autocreate: true    # [!code highlight]
```

**Authentication Methods:**

1. **Explicit Credentials**: Provide `access-key-id` and `secret-access-key`
2. **IAM Roles**: Omit credentials when running on EC2/ECS with IAM roles
3. **AWS Profile**: Use `profile` to specify AWS profile from ~/.aws/config
4. **Environment Variables**: Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION

#### `fs` (Filesystem) <Badge type="info" text="v0.5+" />

This refers to the local file system

**Optional Parameters:**

| Parameter      | Type    | Required | Description                                                               |
| -------------- | ------- | -------- | ------------------------------------------------------------------------- |
| `storage-type` | String  | Y        | Set to `fs` for Local file system                                         |
| `folder`       | String  | Y        | The path where files are stored                                           |
| `autocreate`   | Boolean | N        | if set to `true`, entity will be created automatically (default: `false`) |

**Example:**

```yaml
sources:
  my-local-files:
    provider: storage
    options:
      storage-mode: files
      storage-type: fs    # [!code highlight]
      folder: ./data/    # [!code highlight]
```

#### `ftp` (FTP Server) <Badge type="info" text="v0.5+" />

This refers to use a FTP server

**Optional Parameters:**

| Parameter      | Type             | Required | Description                                                              |
| -------------- | ---------------- | -------- | ------------------------------------------------------------------------ |
| `storage-type` | String           | Y        | Set to `ftp` for FTP server                                              |
| `host`         | String           | Y        | FTP server host                                                          |
| `port`         | Number (1-65535) | N        | FTP server port , default: 21                                            |
| `user`         | String           | Y        | FTP server username                                                      |
| `password`     | String           | Y        | FTP server password                                                      |
| `secure`       | Boolean          | N        | Enable Secure FTP connection (FTPS) , default: `false`                   |
| `folder`       | String           | N        | Remote folder on the FTP server , default: `/`                           |
| `autocreate`   | Boolean          | N        | if set to `true`, entity will be created automatically, default: `false` |

**Example:**

```yaml
sources:
  my-ftp-files:
    provider: storage
    options:
      storage-mode: files
      storage-type: ftp    # [!code highlight]
      host: ftp.server.com    # [!code highlight]
      port: 21    # [!code highlight]
      user: ftpuser    # [!code highlight]
      password: ftppass    # [!code highlight]
      folder: /    # [!code highlight]
```

#### `sftp` (SFTP Server) <Badge type="info" text="v0.5+" />

This refers to use a SFTP server

**Optional Parameters:**

| Parameter      | Type             | Required | Description                                                              |
| -------------- | ---------------- | -------- | ------------------------------------------------------------------------ |
| `storage-type` | String           | Y        | Set to `sftp` for SFTP server                                            |
| `host`         | String           | Y        | SFTP server host                                                         |
| `port`         | Number (1-65535) | N        | SFTP server port , default: 22                                           |
| `user`         | String           | Y        | SFTP server username                                                     |
| `password`     | String           | N        | SFTP server password (required if not using private key)                 |
| `private-key`  | String           | N        | Private key for authentication (required if not using password)          |
| `passphrase`   | String           | N        | Passphrase for private key (if encrypted)                                |
| `folder`       | String           | N        | Remote folder on the SFTP server , default: `/`                          |
| `autocreate`   | Boolean          | N        | if set to `true`, entity will be created automatically, default: `false` |

**Authentication Methods:**

1. **Password Authentication**: Provide `password` parameter
2. **Private Key Authentication**: Provide `private-key` parameter (optionally with `passphrase`)

**Example:**

```yaml
sources:
  my-sftp-files:
    provider: storage
    options:
      storage-mode: files
      storage-type: sftp    # [!code highlight]
      host: sftp.server.com    # [!code highlight]
      port: 22    # [!code highlight]
      user: sftpuser    # [!code highlight]
      password: sftppass    # [!code highlight]
      folder: /    # [!code highlight]
```

**Example with Private Key Authentication:**

```yaml
sources:
  my-sftp-files:
    provider: storage
    options:
      storage-mode: files
      storage-type: sftp    # [!code highlight]
      host: sftp.server.com    # [!code highlight]
      port: 22    # [!code highlight]
      user: sftpuser    # [!code highlight]
      private-key: |    # [!code highlight]
        -----BEGIN RSA PRIVATE KEY-----
        MIIEpAIBAAKCAQEA...
        -----END RSA PRIVATE KEY-----
      passphrase: my-secret-passphrase    # [!code highlight]
      folder: /data    # [!code highlight]
```

### `content` <Badge type="default" text="v0.3+" />

Content types can be set with the parameter `options.content` where you can associate a content type to a file pattern, as shown in the example below. This feature allows for flexible data processing and supports various file formats, including JSON, CSV, XLSX, and Parquet.

It acts also as a filter to determine the list of files to process (see: [REST API Entity Listing](rest-api#get)). By specifying the content type for each file pattern, you can efficiently manage and process your data.

**Example:**

```yaml
sources:
  my-files:
    provider: storage
    options:
      storage-mode: files
      content:    # [!code highlight]
        "*.json":    # [!code highlight]
          content-type: json    # [!code highlight]
        "*.csv":    # [!code highlight]
          content-type: csv    # [!code highlight]
        "sample_*.xlsx":    # [!code highlight]
          content-type: xlsx    # [!code highlight]
          xlsx-sheet: Sheet2    # [!code highlight]
        "my-other-files_*.xlsx":    # [!code highlight]
          content-type: xlsx    # [!code highlight]
          xlsx-sheet: Sheet1    # [!code highlight]
```

List of managed content types:

| Parameter | Description              | Metal version                         |
| --------- | ------------------------ | ------------------------------------- |
| `json`    | JSON files               | <Badge type="default" text="v0.3+" /> |
| `csv`     | CSV files                | <Badge type="default" text="v0.3+" /> |
| `xlsx`    | XLSX files (Excel 2007+) | <Badge type="info" text="v0.5+" />    |
| `xml`     | XML files                | <Badge type="default" text="v0.4+" /> |
| `parquet` | Parquet files            | <Badge type="info" text="v0.5+" />    |

#### `json` <Badge type="default" text="v0.3+" />

| Parameter     | Type   | Description                                                               |
| ------------- | ------ | ------------------------------------------------------------------------- |
| 📜 `json-path` | String | the JSON path of the Data Array in the JSON file (default: empty string). |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Example:**

```yaml
sources:
  my-json-files:
    provider: storage
    options:
      storage-mode: files
      content:    # [!code highlight]
        "*.json":    # [!code highlight]
          content-type: json    # [!code highlight]
          json-path: rows    # [!code highlight]
      …
```

#### `csv` <Badge type="info" text="v0.5+" />

| Parameter              | Type    | Description                                                                                 |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `csv-delimiter`        | String  | The delimiting character (default: `;`).                                                    |
| `csv-newline`          | String  | The newline sequence. Must be one of `\r`, `\n`, or `\r\n` (default: `\r\n`).               |
| `csv-header`           | Boolean | If true, the first row of parsed data will be interpreted as field names (default: `true`). |
| `csv-quote`            | String  | The character used to quote fields (default: `"`).                                          |
| `csv-skip-empty-lines` | Boolean | If true, lines that are completely empty will be skipped (default: `true`).                 |

**Example:**

```yaml
sources:
  my-csv-files:
    provider: storage
    options:
      storage-mode: files
      content:    # [!code highlight]
        "*.csv":    # [!code highlight]
          content-type: csv    # [!code highlight]
          csv-delimiter: ","    # [!code highlight]
          csv-newline: "\n"    # [!code highlight]
          csv-header: true    # [!code highlight]
          csv-quote: "\""    # [!code highlight]
      …
```

#### `xlsx` <Badge type="info" text="v0.5+" />

::: tip ℹ️ NOTE
Only XLSX files created with Excel 2007 and later are supported.
:::

| Parameter            | Type    | Description                                                      |
| -------------------- | ------- | ---------------------------------------------------------------- |
| `xlsx-sheet`         | String  | Specify which sheet to use, default first sheet.                 |
| `xlsx-starting-cell` | String  | Specify the starting cell (e.g., `"B2"`), default `"A1"`.        |
| `xlsx-default`       | Any     | Default value for empty cells, default `null`.                   |
| `xlsx-parse-dates`   | Boolean | Parse dates from cells, default `false`.                         |
| `xlsx-date-format`   | String  | Specify the date format for parsing dates, default: `dd/mm/yyyy` |

**Example:**

```yaml
sources:
  my-xlsx-files:
    provider: storage
    options:
      storage-mode: files
      content:    # [!code highlight]
        "*.xlsx":    # [!code highlight]
          content-type: xlsx    # [!code highlight]
          xlsx-sheet: Sheet1    # [!code highlight]
          xlsx-starting-cell: E6    # [!code highlight]
```

#### `xml` <Badge type="default" text="v0.4+" />

| Parameter               | Type    | Description                                                           |
| ----------------------- | ------- | --------------------------------------------------------------------- |
| `xml-path`              | String  | Specify the XML path to use, default whole XML.                       |
| `xml-ignore-attributes` | Boolean | Ignore XML attributes, default `true`.                                |
| `xml-attribute-prefix`  | String  | Prefix for XML attributes, default `@`.                               |
| `xml-remove-ns-prefix`  | Boolean | Remove namespace string from tag and attribute names, default `true`. |

**Example:**

```yaml
sources:
  my-xml-files:
    provider: storage
    options:
      storage-mode: files
      content:    # [!code highlight]
        "*.xml":    # [!code highlight]
          content-type: xml    # [!code highlight]
          xml-path: data    # [!code highlight]
          xml-ignore-attributes: false    # [!code highlight]
          xml-attribute-prefix: "@"    # [!code highlight]
          xml-remove-ns-prefix: true    # [!code highlight]
```

#### `parquet` <Badge type="info" text="v0.5+" />

Parquet files using hyparquet library for in-memory operations. Supports columnar data format with efficient compression and schema evolution.

| Parameter      | Type    | Default | Description                        |
| -------------- | ------- | ------- | ---------------------------------- |
| `parquet-utf8` | Boolean | true    | Decode byte arrays as utf8 strings |

**Example:**

```yaml
sources:
  my-parquet-files:
    provider: storage
    options:
      storage-mode: files
      content:    # [!code highlight]
        "*.parquet":    # [!code highlight]
          content-type: parquet    # [!code highlight]
          parquet-utf8: true    # [!code highlight]
```

## WebService <Badge type="default" text="v0.4+" />

Used to connect to a WebService

**Primary parameters:**

| Parameter  | Type   | Required | Description                            |
| ---------- | ------ | -------- | -------------------------------------- |
| `provider` | String | Y        | Set to `webservice` for Web Service    |
| `host`     | String | Y        | URL of the target server to connect to |

**Optional parameters:**

| Parameter   | Type   | Required | Description                                                           |
| ----------- | ------ | -------- | --------------------------------------------------------------------- |
| `type`      | String | Y        | Type of the webservice (see: [Web service types](#web-service-types)) |
| `endpoints` | Object | Y        | List of Endpoints configuration for interacting with the websrvice    |

### `type`

Defines the type of webservices:

| Parameter | Description         | Metal version                         |
| --------- | ------------------- | ------------------------------------- |
| `rest`    | RESTful web service | <Badge type="default" text="v0.4+" /> |
| `soap`    | SOAP web service    | <Badge type="default" text="v0.4+" /> |

### `endpoints`

this section contains the configuration for the endpoints of the webservice.
Each endpoint is defined by a key (e.g. `session`) and an object that contains the configuration:

| Endpoint          | Type   | Required | Description                                 |
| ----------------- | ------ | -------- | ------------------------------------------- |
| `session`         | Object | N        | Endpoint configuration for session or login |
| `collection-read` | Object | Y        | Endpoint configuration for collection read  |
| `item-create`     | Object | N        | Endpoint configuration for item to create   |
| `item-update`     | Object | N        | Endpoint configuration for item to update   |
| `item-delete`     | Object | N        | Endpoint configuration for item to delete   |

#### `session`

This endpoint is used to establish a connection with the webservice and obtain any necessary authentication tokens or session IDs.

The endpoint configuration includes the HTTP method to use, the relative URL to request, and any data to be sent with the request. Additionally, it can include headers to be added after a successful login session.

| Parameter                   | Type   | Description                                                                                                                                      | JS Context variable                                                                                                                                                                                                                                 |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 📜 _`<method or operation>`_ | String | The Key is the method or operation to use (e.g. `get`,`listMovies`). see: [Method or Operation key](#method)                                     | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity)                                                                                                                                                        |
| 📜 `data`                    | Object | Data to send with the request. If not set, object in Optional Parameter [`data`](optional-parameters#data) will be passed AsIs to the webservice | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity)                                                                                                                                                        |
| 📜 `session-headers`         | Object | Headers to add after login is successful                                                                                                         | [`$schema`](dynamic-expression-engine#schema)<br>[`$entity`](dynamic-expression-engine#entity)<br>[`$vars`](dynamic-expression-engine#vars)<br>[`$request`](dynamic-expression-engine#request)<br>[`$response`](dynamic-expression-engine#response) |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

<u>**Method or Operation key**:</u>{#method}

- For RESTful webservices, the key is the method (e.g. `get`) and the value is the relative URL to request
- For SOAP webservices, the key is the operation (e.g. `listMovies`) with empty value

**Example:**

In this example we login to [DummyJSON.com](https://dummyjson.com/) with sending username and password in the body of the POST request and storing the access token in a header.

```yaml
rest-dummyjson: # https://dummyjson.com/docs
  provider: webservice
  host: https://dummyjson.com/
  options:
    type: rest
    endpoints:
      session: # [!code highlight]
        post: /user/login # [!code highlight]
        data: # [!code highlight]
          username: emilys # [!code highlight]
          password: emilyspass # [!code highlight]
        session-headers: # [!code highlight]
          Authorization: "Bearer: ${{ $response.body.accessToken }}" # [!code highlight]
```

#### `collection-read`

This endpoint is used to read data from a collection. The endpoint configuration includes the HTTP method to use, the relative URL to request, and any data to be sent with the request.

| Parameter                   | Type   | Description                                                                                                                                      | JS Context variable                                                                                                                                                                                                                                 |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 📜 _`<method or operation>`_ | String | The Key is the method or operation to use (e.g. `get`,`listMovies`). see: [Method or Operation key](#method)                                     | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity)                                                                                                                                                        |
| 📜 `data`                    | Object | Data to send with the request. If not set, object in Optional Parameter [`data`](optional-parameters#data) will be passed AsIs to the webservice | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity)                                                                                                                                                        |
| 📜 `response`                | String | response path to get data                                                                                                                        | [`$schema`](dynamic-expression-engine#schema)<br>[`$entity`](dynamic-expression-engine#entity)<br>[`$vars`](dynamic-expression-engine#vars)<br>[`$request`](dynamic-expression-engine#request)<br>[`$response`](dynamic-expression-engine#response) |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Example:**

In this example we get a RESTful GET request a list of all dog breeds from [Dog.ceo](https://dog.ceo/dog-api/documentation/) and return data in response.body.message

```yaml
rest-dog: # https://dog.ceo/dog-api/documentation/
  provider: webservice
  host: https://dog.ceo/api
  options:
    type: rest
    endpoints:
      collection-read: # [!code highlight]
        get: /breeds/list/all   # [!code highlight]
        response: message   # [!code highlight]
```

#### `item-create`

This endpoint is used to create a new item. The endpoint configuration includes the HTTP method to use, the relative URL to request, and any data to be sent with the request.

| Parameter                   | Type   | Description                                                                                                                                      | JS Context variable                                                                                                                                                                    |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 📜 _`<method or operation>`_ | String | The Key is the method or operation to use (e.g. `get`,`listMovies`). see: [Method or Operation key](#method)                                     | [`$schema`](dynamic-expression-engine#schema)<br>[`$entity`](dynamic-expression-engine#entity)<br>[`$vars`](dynamic-expression-engine#vars)<br>                                        |
| 📜 `data`                    | Object | Data to send with the request. If not set, object in Optional Parameter [`data`](optional-parameters#data) will be passed AsIs to the webservice | [`$schema`](dynamic-expression-engine#schema)<br>[`$entity`](dynamic-expression-engine#entity)<br>[`$vars`](dynamic-expression-engine#vars)<br>[`$row`](dynamic-expression-engine#row) |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Example:**

In this example we create item in a RESTful POST

```yaml
rest-fakerestapi: # https://fakerestapi.azurewebsites.net/index.html
  provider: webservice
  host: https://fakerestapi.azurewebsites.net/api/v1/
  options:
    type: rest
    endpoints:
      item-create: # [!code highlight]
        post: / # [!code highlight]
```

#### `item-update`

This endpoint is used to update an existing item. The endpoint configuration includes the HTTP method to use, the relative URL to request, and any data to be sent with the request.

| Parameter                   | Type   | Description                                                                                                                                      | JS Context variable                                                                                                                                                                    |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 📜 _`<method or operation>`_ | String | The Key is the method or operation to use (e.g. `get`,`listMovies`). see: [Method or Operation key](#method)                                     | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity)                                                                                           |
| 📜 `data`                    | Object | Data to send with the request. If not set, object in Optional Parameter [`data`](optional-parameters#data) will be passed AsIs to the webservice | [`$schema`](dynamic-expression-engine#schema)<br>[`$entity`](dynamic-expression-engine#entity)<br>[`$vars`](dynamic-expression-engine#vars)<br>[`$row`](dynamic-expression-engine#row) |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Example:**

In this example we update item in a RESTful PUT using JS Context variables `$schema` and `$row` to build the URL

```yaml
rest-fakerestapi: # https://fakerestapi.azurewebsites.net/index.html
  provider: webservice
  host: https://fakerestapi.azurewebsites.net/api/v1/
  options:
    type: rest
    endpoints:
      item-update: # [!code highlight]
        put: /${{ $entity }}/${{ $row.id }} # [!code highlight]
```

#### `item-delete`

This endpoint is used to delete an existing item. The endpoint configuration includes the HTTP method to use, the relative URL to request, and any data to be sent with the request.

| Parameter                   | Type   | Description                                                                                                                                      | JS Context variable                                                                                                                                                                    |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 📜 _`<method or operation>`_ | String | The Key is the method or operation to use (e.g. `get`,`listMovies`). see: [Method or Operation key](#method)                                     | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity)                                                                                           |
| 📜 `data`                    | Object | Data to send with the request. If not set, object in Optional Parameter [`data`](optional-parameters#data) will be passed AsIs to the webservice | [`$schema`](dynamic-expression-engine#schema)<br>[`$entity`](dynamic-expression-engine#entity)<br>[`$vars`](dynamic-expression-engine#vars)<br>[`$row`](dynamic-expression-engine#row) |

> 📜: Supports JavaScript Expression Engine (see: [JavaScript Expression Engine](dynamic-expression-engine#javascript-expression-engine))

**Example:**

In this example we update item in a RESTful DELETE using JS Context variables `$schema` and `$row` to build the URL

```yaml
rest-fakerestapi: # https://fakerestapi.azurewebsites.net/index.html
  provider: webservice
  host: https://fakerestapi.azurewebsites.net/api/v1/
  options:
    type: rest
    endpoints:
      item-delete: # [!code highlight]
        delete: /${{ $entity }}/${{ $row.id }} # [!code highlight]
```
