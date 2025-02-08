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

| Parameter               | Type              | Default Value | Description                                                                                                                                                                                                                                             |
| ----------------------- | ----------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `connectTimeoutMS`      | integer           | 30000         | Specifies the number of milliseconds to wait before timeout on a TCP connection.                                                                                                                                                                        |
| `directConnection`      | boolean           | false         | Specifies whether to force dispatch all operations to the host specified in the connection URI.                                                                                                                                                         |
| `family`                | number            | null          | Specifies the version of the Internet Protocol (IP). Valid values are: 4, 6, 0, or null. 0 and null settings attempt to connect with IPv6 and fall back to IPv4 upon failure.                                                                           |
| `forceServerObjectId`   | boolean           | false         | Specifies whether to force the server to assign \_id values to documents instead of the driver.                                                                                                                                                         |
| `ignoreUndefined`       | boolean           | false         | Specifies whether the BSON serializer should ignore undefined fields.                                                                                                                                                                                   |
| `keepAlive`             | boolean           | true          | Specifies whether to enable keepAlive on the TCP socket.                                                                                                                                                                                                |
| `keepAliveInitialDelay` | integer           | 120000        | Specifies the number of milliseconds to wait before initiating keepAlive on the TCP socket.                                                                                                                                                             |
| `logger`                | object            | null          | Specifies a custom logger for the client to use.                                                                                                                                                                                                        |
| `loggerLevel`           | string            | null          | Specifies the logger level used by the driver. Valid choices are: error, warn, info, and debug.                                                                                                                                                         |
| `maxPoolSize`           | integer           | 100           | Specifies the maximum number of connections that a connection pool may have at a given time.                                                                                                                                                            |
| `maxIdleTimeMS`         | integer           | ∞             | Specifies the maximum amount of time a connection can remain idle in the connection pool before being removed and closed.                                                                                                                               |
| `minPoolSize`           | integer           | 0             | Specifies the minimum number of connections that must exist at any moment in a single connection pool.                                                                                                                                                  |
| `noDelay`               | boolean           | true          | Specifies whether to use the TCP socket no-delay option.                                                                                                                                                                                                |
| `pkFactory`             | object            | null          | Specifies a primary key factory object that generates custom \_id keys.                                                                                                                                                                                 |
| `promiseLibrary`        | object            | null          | Specifies the Promise library class the application uses (e.g. Bluebird). This library must be compatible with ES6.                                                                                                                                     |
| `promoteBuffers`        | boolean           | false         | Specifies whether to promote Binary BSON values to native Node.js Buffer type data.                                                                                                                                                                     |
| `promoteLongs`          | boolean           | true          | Specifies whether to convert Long values to a number if they fit inside 53 bits of resolution.                                                                                                                                                          |
| `promoteValues`         | boolean           | true          | Specifies whether to promote BSON values to Node.js native types when possible. When set to false, it uses wrapper types to present BSON values.                                                                                                        |
| `raw`                   | boolean           | false         | Specifies whether to return document results as raw BSON buffers.                                                                                                                                                                                       |
| `serializeFunctions`    | boolean           | false         | Specifies whether to serialize functions on any object passed to the server.                                                                                                                                                                            |
| `serverApi`             | string or enum    | null          | Specifies the API version that operations must conform to.                                                                                                                                                                                              |
| `srvMaxHosts`           | integer           | 0             | Sets the maximum number of hosts the driver can connect to when using the DNS seedlist (SRV) connection protocol, identified by the mongodb+srv connection string prefix. When set to 0, the driver does not limit the number of hosts.                 |
| `srvServiceName`        | string            | mongodb       | Specifies the SRV record service name to which the driver should connect.                                                                                                                                                                               |
| `socketTimeoutMS`       | integer           | 360000        | Specifies the number of milliseconds to wait before timeout on a TCP socket.                                                                                                                                                                            |
| `tls`                   | boolean           | false         | Specifies whether to establish a Transport Layer Security (TLS) connection with the instance. This is automatically set to true when using a DNS seedlist (SRV) in the connection string. You can override this behavior by setting the value to false. |
| `validateOptions`       | boolean           | false         | Specifies whether to error when the method parameters contain an unknown or incorrect option. If false, the driver produces warnings only.                                                                                                              |
| `waitQueueTimeoutMS`    | integer           | 0             | Specifies the maximum amount of time in milliseconds that operation execution can wait for a connection to become available.                                                                                                                            |
| `writeConcern`          | string or integer | null          | Specifies the write concern.                                                                                                                                                                                                                            |

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

| Parameter    | Type    | Default Value | Required | Description                                            |
| ------------ | ------- | ------------- | -------- | ------------------------------------------------------ |
| `autocreate` | Boolean | `false`       | N        | if set to `true`, entity will be created automatically |

**Example:**

```yaml
sources:
  my-memory:
    provider: memory
    options:
      autocreate: true
```

<!--
## MySql //TODO
-->

## Files <Badge type="info" text="^0.4" />

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

| Parameter    | Type    | Default value | Required | Description                                                                                                                                                                                    |
| ------------ | ------- | ------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`    | String  |               | Y        | The storage where the files are stored, see: [Storage Types](#storage-types)                                                                                                                   |
| `content`    | Object  |               | Y        | Contains pattern of files and associated content type, including JSON, CSV, and XLS, with optional parameters for customizing the content type settings., see: [Content Types](#content-types) |
| `autocreate` | Boolean | `false`       | N        | if set to `true`, when interacting with entities that do not exist, files with same entity name will be created automatically                                                                  |

### Storage Types

Storage types can be set with the parameter `options.storage` as shown in the example below:

```yaml
sources:
  my-files:
    provider: files
    options:
      storage: fs
```

List of managed storage types:

| Parameter | Description        |
| --------- | ------------------ |
| `az-blob` | Azure Blob Storage |
| `fs`      | Local file system  |
| `ftp`     | FTP server         |

#### Filesystem

This refers to the local file system

**Optional Parameters:**

| Parameter    | Type    | Default value | Required | Description                                            |
| ------------ | ------- | ------------- | -------- | ------------------------------------------------------ |
| `storage`    | String  |               | Y        | Set to `fs` for Local file system                      |
| `autocreate` | Boolean | `false`       | N        | if set to `true`, entity will be created automatically |
| `fs-folder`  | String  | `.`           | Y        | The path where files are stored                        |

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

#### Azure Blob Storage

This refers to use a Azure Blob Storage

**Optional Parameters:**

| Parameter                   | Type   | Required | Description                                                                |
| --------------------------- | ------ | -------- | -------------------------------------------------------------------------- |
| `storage`                   | String | Y        | Set to `azureBlob` for Azure Blob Storage                                  |
| `az-blob-connection-string` | String | Y        | Azure Blob Connection String                                               |
| `az-blob-container`         | String | Y        | Azure Blob Container name                                                  |
| `az-blob-autocreate`        | String | `false`  | If set to `true` then the container will be created with the provided name |

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

#### FTP Server

This refers to use a FTP server

**Optional Parameters:**

| Parameter      | Type             | Default Value | Required | Description                                            |
| -------------- | ---------------- | ------------- | -------- | ------------------------------------------------------ |
| `storage`      | String           |               | Y        | Set to `ftp` for FTP server                            |
| `autocreate`   | Boolean          | `false`       | N        | if set to `true`, entity will be created automatically |
| `ftp-host`     | String           |               | Y        | FTP server host                                        |
| `ftp-port`     | Number (1-65535) | `21`          | N        | FTP server port                                        |
| `ftp-user`     | String           |               | Y        | FTP server username                                    |
| `ftp-password` | String           |               | Y        | FTP server password                                    |
| `ftp-secure`   | Boolean          | `false`       | N        | Enable Secure FTP connection (FTPS)                    |
| `ftp-folder`   | String           | `/`           | N        | Remote folder on the FTP server                        |

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

### Content Types

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

#### JSON

| Parameter   | Type   | Default value       | Description                                       |
| ----------- | ------ | ------------------- | ------------------------------------------------- |
| `json-path` | String | `''` (empty string) | the JSON path of the Data Array in the JSON file. |

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

#### CSV

| Parameter        | Type            | Default value               | Description                                                                                                                                                                                                                      |
| ---------------- | --------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `csv-delimiter`  | String          | `,`                         | The delimiting character.                                                                                                                                                                                                        |
| `csv-newline`    | String          | `\n`                        | The newline sequence. Must be one of `\r`, `\n`, or `\r\n`.                                                                                                                                                                      |
| `csv-header`     | Boolean         | `true`                      | If true, the first row of parsed data will be interpreted as field names.                                                                                                                                                        |
| `csv-quote`      | String          | `"`                         | The character used to quote fields.                                                                                                                                                                                              |
| `csv-skip-empty` | String\|Boolean | `greedy` \| `true`\|`false` | If true, lines that are completely empty (those which evaluate to an empty string) will be skipped. If set to `greedy`, lines that don't have any content (those which have only whitespace after parsing) will also be skipped. |

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

#### XLS

::: tip ℹ️ NOTE
Only XLSX files created with Excel 2007 and later are supported.
:::

| Parameter           | Type    | Default value | Description                                               |
| ------------------- | ------- | ------------- | --------------------------------------------------------- |
| `xls-sheet`         | String  |               | Specify which sheet to use, default first sheet.          |
| `xls-starting-cell` | String  | `A1`          | Specify the starting cell (e.g., `"B2"`), default `"A1"`. |
| `xls-default`       | any     |               | Default value for empty cells.                            |
| `xls-parse-dates`   | Boolean | `false`       | Parse dates from cells, default `false`.                  |
| `xls-date-format`   | String  |               | Specify the date format for parsing dates.                |

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

#### XML

| Parameter               | Type    | Default value | Description                                                           |
| ----------------------- | ------- | ------------- | --------------------------------------------------------------------- |
| `xml-path`              | String  |               | Specify the XML path to use, default whole XML.                       |
| `xml-ignore-attributes` | Boolean | `true`        | Ignore XML attributes, default `true`.                                |
| `xml-attribute-prefix`  | String  | `@`           | Prefix for XML attributes, default `@`.                               |
| `xml-remove-ns-prefix`  | Boolean | `true`        | Remove namespace string from tag and attribute names, default `true`. |

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
