---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

# Data Providers Configurations

These configurations define the setups required for connecting to various Data providers such as Microsoft SQL Server, PostgreSQL, MongoDB or files as data sources.

Each configuration specifies the necessary parameters such as host, port, user credentials, and additional options for optimal performance and security.

## Azure SQL Database/Microsoft SQL Server <Badge type="default" text="^0.1" />

**Primary parameters:**

| Parameter  | Type    | Required | Description                                                                      |
| ---------- | ------- | -------- | -------------------------------------------------------------------------------- |
| `provider` | String  | Y        | Set to `mssql` for Azure SQL Database/Microsoft SQL Server                       |
| `host`     | String  | Y        | Server to connect to. Use `localhost\instance` for named instances.              |
| `port`     | Integer | N        | Port to connect to (default: 1433). Don't set when connecting to named instance. |
| `user`     | String  | Y        | User name for authentication.                                                    |
| `password` | String  | Y        | Password for authentication.                                                     |
| `database` | String  | Y        | Database to connect to (default: dependent on server configuration).             |

**Optional parameters:**

| Parameter                | Type    | Description                                                                              |
| ------------------------ | ------- | ---------------------------------------------------------------------------------------- |
| `domain`                 | String  | Domain for domain login to SQL Server.                                                   |
| `connectionTimeout`      | Integer | Connection timeout in milliseconds (default: 15000).                                     |
| `requestTimeout`         | Integer | Request timeout in milliseconds (default: 15000).                                        |
| `stream`                 | Boolean | Stream recordsets/rows instead of returning them all at once as an argument of callback. |
| `parseJSON`              | Boolean | Parse JSON recordsets to JS objects.                                                     |
| `arrayRowMode`           | String  | Return row results as an array instead of a keyed object.                                |
| `pool.max`               | Integer | Maximum number of connections in the pool (default: 10).                                 |
| `pool.min`               | Integer | Minimum number of connections in the pool (default: 0).                                  |
| `pool.idleTimeoutMillis` | Integer | Number of milliseconds before closing an unused connection in the pool (default: 30000). |
| `encrypt`                | Boolean | Use `true` for Azure.                                                                    |
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
      pool:
        max: 10
        min: 0
        idleTimeoutMillis: 30000
```

## PostgreSQL <Badge type="default" text="^0.1" />

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
| `ssl`                                 | String  | Options passed directly to`node.TLSSocket`. Supports all`tls.connect`                                                                                                                              |
| `types`                               | String  | Custom type parsers.                                                                                                                                                                               |
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

## Metal Server <Badge type="default" text="^0.2" />

This is used to connect to another instance of Metal Server via REST

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

## MongoDB <Badge type="default" text="^0.1" />

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

## Plan <Badge type="default" text="^0.2" />

Used to connect to a Metal ETL Plan

**Parameters:**

| Parameter  | Type   | Required | Description                     |
| ---------- | ------ | -------- | ------------------------------- |
| `provider` | String | Y        | Set to `plan` for plan          |
| `database` | String | Y        | Name of the plan to connect to. |

**Example:**

```yaml
sources:
  my-plan-source:
    provider: plan
    database: my-plan
```

## Memory <Badge type="default" text="^0.2" />

Non-persistant Memory Database

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

## MySql <Badge type="info" text="^0.4" />

The MySql data provider is used to connect to a MySql database. It supports various parameters to customize the connection and data retrieval.

**Primary parameters:**

| Parameter  | Type    | Required | Description                                |
| ---------- | ------- | -------- | ------------------------------------------ |
| `provider` | String  | Y        | Set to `mysql` for MySql data provider     |
| `host`     | String  | Y        | Server to connect to (default: localhost). |
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

## Files <Badge type="default" text="^0.3" />

Files is a unique data provider that offers a seamless experience akin to accessing tables while interacting with file-based data. This versatile tool accommodates various content types and storage options, catering to diverse user preferences and requirements.

**Example:**

```yaml
sources:
  my-files:
    provider: files
```

**Primary parameters:**

| Parameter  | Type   | Required | Description                            |
| ---------- | ------ | -------- | -------------------------------------- |
| `provider` | String | Y        | Set to `files` for Files data provider |

**Optional parameters:**

| Parameter    | Type    | Required | Description                                                                                                                                                                                    |
| ------------ | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`    | String  | Y        | The storage where the files are stored, see: [Storage Types](#storage-types)                                                                                                                   |
| `content`    | Object  | Y        | Contains pattern of files and associated content type, including JSON, CSV, and XLS, with optional parameters for customizing the content type settings., see: [Content Types](#content-types) |
| `autocreate` | Boolean | N        | if set to `true`, when interacting with entities that do not exist, files with same entity name will be created automatically (default: `false`)                                               |

### `storage` <Badge type="default" text="^0.3" />

Storage types can be set with the parameter `options.storage` as shown in the example below:

```yaml
sources:
  my-files:
    provider: files
    options:
      storage: fs
```

List of managed storage types:

| Parameter | Description        | Metal version                        |
| --------- | ------------------ | ------------------------------------ |
| `az-blob` | Azure Blob Storage | <Badge type="default" text="^0.3" /> |
| `fs`      | Local file system  | <Badge type="default" text="^0.3" /> |
| `ftp`     | FTP server         | <Badge type="default" text="^0.3" /> |

#### `fs` (Filesystem) <Badge type="default" text="^0.3" />

This refers to the local file system

**Optional Parameters:**

| Parameter    | Type    | Required | Description                                                               |
| ------------ | ------- | -------- | ------------------------------------------------------------------------- |
| `storage`    | String  | Y        | Set to `fs` for Local file system                                         |
| `autocreate` | Boolean | N        | if set to `true`, entity will be created automatically (default: `false`) |
| `fs-folder`  | String  | Y        | The path where files are stored (default: `.`)                            |

**Example:**

```yaml
sources:
  my-local-files:
    provider: files
    options:
      storage: fs
      fs-folder: ./data/
      ...
```

#### `az-blob` (Azure Blob Storage) <Badge type="default" text="^0.3" />

This refers to use a Azure Blob Storage

**Optional Parameters:**

| Parameter                   | Type   | Required | Description                                                                                 |
| --------------------------- | ------ | -------- | ------------------------------------------------------------------------------------------- |
| `storage`                   | String | Y        | Set to `az-blob` for Azure Blob Storage                                                     |
| `az-blob-connection-string` | String | Y        | Azure Blob Connection String                                                                |
| `az-blob-container`         | String | Y        | Azure Blob Container name                                                                   |
| `az-blob-autocreate`        | String | N        | If set to `true` then the container will be created with the provided name, defult: `false` |

**Example:**

```yaml
sources:
  my-local-files:
    provider: files
    options:
      storage: az-blob
      az-blob-connection-string: UseDevelopmentStorage=true
      az-blob-container: datacontainer1
      az-blob-autocreate: true
      ...
```

#### `ftp` (FTP Server) <Badge type="default" text="^0.3" />

This refers to use a FTP server

**Optional Parameters:**

| Parameter      | Type             | Required | Description                                                              |
| -------------- | ---------------- | -------- | ------------------------------------------------------------------------ |
| `storage`      | String           | Y        | Set to `ftp` for FTP server                                              |
| `autocreate`   | Boolean          | N        | if set to `true`, entity will be created automatically, default: `false` |
| `ftp-host`     | String           | Y        | FTP server host                                                          |
| `ftp-port`     | Number (1-65535) | N        | FTP server port , default: 21                                            |
| `ftp-user`     | String           | Y        | FTP server username                                                      |
| `ftp-password` | String           | Y        | FTP server password                                                      |
| `ftp-secure`   | Boolean          | N        | Enable Secure FTP connection (FTPS) , default: `false`                   |
| `ftp-folder`   | String           | N        | Remote folder on the FTP server , default: `/`                           |

**Example:**

```yaml
sources:
  my-ftp-files:
    provider: files
    options:
      storage: ftp
      ftp-host: ftp.server.com
      ftp-port: 21
      ftp-user: ftp-user
      ftp-password: ftppass
      ftp-folder: /
      ...
```

### `content` <Badge type="default" text="^0.3" />

Content types can be set with the parameter `options.content` where you can associate a content type to a file pattern, as shown in the example below. This feature allows for flexible data processing and supports various file formats, including JSON, CSV, and XLS.

It acts also as a filter to determine the list of files to process (see: [REST API Entity Listing](rest-api#get)). By specifying the content type for each file pattern, you can efficiently manage and process your data.

**Example:**

```yaml
sources:
  my-files:
    provider: files
    options:
      content:
        "*.json":
          type: json
        "*.csv":
          type: csv
        "sample_*.xlsx":
          type: xls
          xls-sheet: Sheet2
        "my-other-files_*.xlsx":
          type: xls
          xls-sheet: Sheet1
```

List of managed content types:

| Parameter | Description              | Metal version                        |
| --------- | ------------------------ | ------------------------------------ |
| `json`    | JSON files               | <Badge type="default" text="^0.3" /> |
| `csv`     | CSV files                | <Badge type="default" text="^0.3" /> |
| `xls`     | XLSX files (Excel 2007+) | <Badge type="default" text="^0.3" /> |
| `xml`     | XML files                | <Badge type="info" text="^0.4" />    |

#### `json` <Badge type="default" text="^0.3" />

| Parameter      | Type   | Description                                                               |
| -------------- | ------ | ------------------------------------------------------------------------- |
| 📜 `json-path` | String | the JSON path of the Data Array in the JSON file (default: empty string). |

**Example:**

```yaml
sources:
  my-json-files:
    provider: files
    options:
      content:
        "*.json":
          type: json
          json-path: rows
      ...
```

#### `csv` <Badge type="default" text="^0.3" />

| Parameter        | Type            | Description                                                                                                                                                                                                                                          |
| ---------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `csv-delimiter`  | String          | The delimiting character (default: `,`).                                                                                                                                                                                                             |
| `csv-newline`    | String          | The newline sequence. Must be one of `\r`, `\n`, or `\r\n` (default: `\n`).                                                                                                                                                                          |
| `csv-header`     | Boolean         | If true, the first row of parsed data will be interpreted as field names (default: `true`).                                                                                                                                                          |
| `csv-quote`      | String          | The character used to quote fields (default: `"`).                                                                                                                                                                                                   |
| `csv-skip-empty` | String\|Boolean | If true, lines that are completely empty (those which evaluate to an empty string) will be skipped. If set to `greedy`, lines that don't have any content (those which have only whitespace after parsing) will also be skipped (default: `greedy`). |

**Example:**

```yaml
sources:
  my-csv-files:
    provider: files
    options:
      content:
        "*.csv":
          type: csv
          csv-delimiter: ","
          csv-newline: "\n"
          csv-header: true
          csv-quote: "\""
      ...
```

#### `xls` <Badge type="default" text="^0.3" />

::: tip ℹ️ NOTE
Only XLSX files created with Excel 2007 and later are supported.
:::

| Parameter           | Type    | Description                                               |
| ------------------- | ------- | --------------------------------------------------------- |
| `xls-sheet`         | String  | Specify which sheet to use, default first sheet.          |
| `xls-starting-cell` | String  | Specify the starting cell (e.g., `"B2"`), default `"A1"`. |
| `xls-default`       | Any     | Default value for empty cells.                            |
| `xls-parse-dates`   | Boolean | Parse dates from cells, default `false`.                  |
| `xls-date-format`   | String  | Specify the date format for parsing dates.                |

**Example:**

```yaml
sources:
  my-xls-files:
    provider: files
    options:
      content:
        "*.xlsx":
          type: xls
          xls-sheet: Sheet1
          xls-starting-cell: E6
    ...
```

#### `xml`⚡ <Badge type="info" text="^0.4" />

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
    provider: files
    options:
      content:
        "*.xml":
          type: xml
          xml-path: data
          xml-ignore-attributes: false
          xml-attribute-prefix: "@"
          xml-remove-ns-prefix: true
```

## WebService⚡ <Badge type="info" text="^0.4" />

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

### `type`⚡

Defines the type of webservices:

| Parameter | Description         | Metal version                     |
| --------- | ------------------- | --------------------------------- |
| `rest`    | RESTful web service | <Badge type="info" text="^0.4" /> |
| `soap`    | SOAP web service    | <Badge type="info" text="^0.4" /> |

### `endpoints`⚡

this section contains the configuration for the endpoints of the webservice.
Each endpoint is defined by a key (e.g. `session`) and an object that contains the configuration:

| Endpoint          | Type   | Required | Description                                 |
| ----------------- | ------ | -------- | ------------------------------------------- |
| `session`         | Object | N        | Endpoint configuration for session or login |
| `collection-read` | Object | Y        | Endpoint configuration for collection read  |
| `item-create`     | Object | N        | Endpoint configuration for item to create   |
| `item-update`     | Object | N        | Endpoint configuration for item to update   |
| `item-delete`     | Object | N        | Endpoint configuration for item to delete   |

#### `session`⚡

This endpoint is used to establish a connection with the webservice and obtain any necessary authentication tokens or session IDs.

The endpoint configuration includes the HTTP method to use, the relative URL to request, and any data to be sent with the request. Additionally, it can include headers to be added after a successful login session.

| Parameter                    | Type   | Description                                                                                                                                      | JS Context variable                                                                                                                 |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 📜 _`<method or operation>`_ | String | The Key is the method or operation to use (e.g. `get`,`listMovies`). see: [Method or Operation key](#method)                                     | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity)                                                                      |
| 📜 `data`                    | Object | Data to send with the request. If not set, object in Optional Parameter [`data`](optional-parameters#data) will be passed AsIs to the webservice | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity)                                                                      |
| 📜 `session-headers`         | Object | Headers to add after login is successful                                                                                                         | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity), [`$request`](dynamic-expression-engine#request),[`$response`](dynamic-expression-engine#response) |

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

#### `collection-read`⚡

This endpoint is used to read data from a collection. The endpoint configuration includes the HTTP method to use, the relative URL to request, and any data to be sent with the request.

| Parameter                    | Type   | Description                                                                                                                                      | JS Context variable                                                                                                                 |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 📜 _`<method or operation>`_ | String | The Key is the method or operation to use (e.g. `get`,`listMovies`). see: [Method or Operation key](#method)                                     | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity)                                                                      |
| 📜 `data`                    | Object | Data to send with the request. If not set, object in Optional Parameter [`data`](optional-parameters#data) will be passed AsIs to the webservice | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity)                                                                      |
| 📜 `response`                | String | response path to get data                                                                                                                        | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity), [`$request`](dynamic-expression-engine#request),[`$response`](dynamic-expression-engine#response) |

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
        get: /breeds/list/all# [!code highlight]
        response: message# [!code highlight]
```

#### `item-create`⚡

This endpoint is used to create a new item. The endpoint configuration includes the HTTP method to use, the relative URL to request, and any data to be sent with the request.

| Parameter                    | Type   | Description                                                                                                                                      | JS Context variable                                                                      |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 📜 _`<method or operation>`_ | String | The Key is the method or operation to use (e.g. `get`,`listMovies`). see: [Method or Operation key](#method)                                     | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity)                           |
| 📜 `data`                    | Object | Data to send with the request. If not set, object in Optional Parameter [`data`](optional-parameters#data) will be passed AsIs to the webservice | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity), [`$row`](dynamic-expression-engine#row) |

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

#### `item-update`⚡

This endpoint is used to update an existing item. The endpoint configuration includes the HTTP method to use, the relative URL to request, and any data to be sent with the request.

| Parameter                    | Type   | Description                                                                                                                                      | JS Context variable                                                                      |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 📜 _`<method or operation>`_ | String | The Key is the method or operation to use (e.g. `get`,`listMovies`). see: [Method or Operation key](#method)                                     | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity)                           |
| 📜 `data`                    | Object | Data to send with the request. If not set, object in Optional Parameter [`data`](optional-parameters#data) will be passed AsIs to the webservice | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity), [`$row`](dynamic-expression-engine#row) |

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

#### `item-delete`⚡

This endpoint is used to delete an existing item. The endpoint configuration includes the HTTP method to use, the relative URL to request, and any data to be sent with the request.

| Parameter                    | Type   | Description                                                                                                                                      | JS Context variable                                                                      |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 📜 _`<method or operation>`_ | String | The Key is the method or operation to use (e.g. `get`,`listMovies`). see: [Method or Operation key](#method)                                     | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity)                           |
| 📜 `data`                    | Object | Data to send with the request. If not set, object in Optional Parameter [`data`](optional-parameters#data) will be passed AsIs to the webservice | [`$schema`](dynamic-expression-engine#schema), [`$entity`](dynamic-expression-engine#entity), [`$row`](dynamic-expression-engine#row) |

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
