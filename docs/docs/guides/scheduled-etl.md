---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

<Badge type="default" text="Technical Guide"/>

# Scheduled ETL

Metal Plans and Scheduler functions provide a robust solution for scheduling ETL jobs, allowing seamless data transformation across diverse Database Management Systems (DBMS). Plans can be configured and executed through Plan commands and the Scheduler.

## Prerequisites

Before testing this use case, ensure that the sample project is deployed and ready. (Refer to: [Sample project](../sample-project.md))

## Presentation

Consider a scenario with a database **mflix** containing a table **log** automatically populated with data. The objective is to transfer this data from the **mflix.log** table to another Database **clubdata**, specifically to the table **mflix_log**.

Here are the steps to achieve this transfer:

```mermaid
graph TD
B([begin])
-->
1[update <span style="color:red">mflix.log</span>
set etl_status = 'locked'
where etl_status = 'new']
-->
2[select *
from <span style="color:red">mflix.log</span>
where etl_status = 'locked']
-->
3[select ts, message]
-->
4[insert into <span style="color:green">clubdata.mflix_log</span>]
-->
5[delete from <span style="color:red">mflix.log</span>
where etl_status = 'locked']
-->
E([end])
```

The goal is to configure this plan and schedule it to be executed every 5 seconds.

## Configuration

Start with a minimal Metal configuration file, `config.yml`:

```yaml
version: "0.5"
server:
  port: 3000
  authentication:
    type: local
    default-role: all
  request-limit: 100mb
  verbosity: debug
```

In this configuration, we:

- Set the Metal server port to 3000/TCP with `port: 3000`
- Enable authentication with `authentication:`
- Limit the maximum response size to 100 Mbytes with `request-limit: 100mb`
- Set the logging verbosity to debug with `verbosity: debug`

Add a users section with the user `myapiuser`:

```yaml
roles:
  all: crudla
users:
  myapiuser:
	  password: myStr@ngpa$$w0rd
```

Include the sources **mdb-mflix** and **pg-clubdata** to connect to their databases **mflix** and **clubdata**:

```yaml
sources:
  mdb-mflix:
    provider: mongodb
    host: mongodb://mdb-mflix:27017/
    database: mflix
    options:
      connectTimeoutMS: 5000
      serverSelectionTimeoutMS: 5000
  pg-clubdata:
    provider: postgres
    host: pg-clubdata
    port: 5432
    user: admin
    password: "123456"
    database: clubdata
```

For testing purposes, expose the **mflix** and **clubdata** databases through an HTTP API using the **schemas** section:

```yaml
schemas:
  mflix:
    source: mdb-mflix
  clubdata:
    source: pg-clubdata
```

Configure a plan **fake-data** to populate the **mflix.log** table:

```yaml
plans:
  fake-data:
    log:
      steps:
        - insert:
            schema: mflix
            entity: log
            data:
              ts: ${{Date.now()}}
              message: This is a fake message ${{Math.random()}}
              etl_status: new
```

Now, add the plan **move-data** to set the transfer:

```yaml
plans:
  fake-data: …
  move-data:
    mflix_log:
      steps:
        - update:
            schema: mflix
            entity: log
            filter:
              etl_status: new
            data:
              etl_status: locked
        - select:
            schema: mflix
            entity: log
            filter:
              etl_status: locked
        - fields: ts, message
        - insert:
            schema: clubdata
            entity: mflix_log
        - delete:
            schema: mflix
            entity: log
            filter:
              etl_status: locked
```

| Block                                                                                                    | Step command                                                                                                            |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| update <span style="color:red">mflix.log</span><br>set etl_status = 'locked'<br>where etl_status = 'new' | <pre>- update:<br> schema: mflix<br> entity: log<br> filter:<br> etl_status: new<br> data:<br> etl_status: locked</pre> |
| select \*<br>from <span style="color:red">mflix.log</span><br>where etl_status = 'locked'                | <pre>- select:<br> schema: mflix<br> entity: log<br> filter:<br> etl_status: locked</pre>                               |
| select ts, message                                                                                       | <pre>- fields: ts, message </pre>                                                                                       |
| insert into <span style="color:green">clubdata.mflix_log</span>                                          | <pre>- insert:<br> schema: clubdata<br> entity: mflix_log</pre>                                                         |
| delete from <span style="color:red">mflix.log</span><br>where etl_status = 'locked'                      | <pre>- delete:<br> schema: mflix<br> entity: log<br> filter:<br> etl_status: locked</pre>                               |

::: tip ℹ️ INFO
For more information about using plans, please refer to: [Configuration File Reference (Section Plans)](../documentation/config-yml.md#plans).
:::

Now that the plan is configured, add the jobs to execute the transfer every 5 seconds:

```yaml
schedules:
  insert fake data to mflix.log:
    plan: fake-data
    entity: log
    cron: "*/5 * * * * *"
  move data from mflix.log to clubdata.mflix_log:
    plan: move-data
    entity: mflix_log
    cron: "*/5 * * * * *"
```

The final configuration will be:

```yaml
version: "0.5"
server:
  verbosity: debug
  port: 3000
  authentication:
    type: local
    default-role: all
  request-limit: 100mb

roles:
  all: crudla
users:
  myapiuser:
	  password: myStr@ngpa$$w0rd

sources:
  mdb-mflix:
    provider: mongodb
    host: mongodb://mdb-mflix:27017/
    database: mflix
    options:
      connectTimeoutMS: 5000
      serverSelectionTimeoutMS: 5000
  pg-clubdata:
    provider: postgres
    host: pg-clubdata
    port: 5432
    user: admin
    password: "123456"
    database: clubdata

schemas:
  mflix:
    source: mdb-mflix
  clubdata:
    source: pg-clubdata

schedules:
  insert fake data to mflix.log:
    plan: fake-data
    entity: log
    cron: "*/5 * * * * *"
  move data from mflix.log to clubdata.mflix_log:
    plan: move-data
    entity: mflix_log
    cron: "*/5 * * * * *"

plans:
  fake-data:
    log:
      steps:
        - insert:
            schema: mflix
            entity: log
            data:
              ts: ${{Date.now()}}
              message: This is a fake message ${{Math.random()}}
              etl_status: new
  move-data:
    mflix_log:
      steps:
        - update:
            schema: mflix
            entity: log
            filter:
              etl_status: new
            data:
              etl_status: locked
        - select:
            schema: mflix
            entity: log
            filter:
              etl_status: locked
        - fields: ts, message
        - insert:
            schema: clubdata
            entity: mflix_log
        - delete:
            schema: mflix
            entity: log
            filter:
              etl_status: locked
```

With the configuration set, restart the Metal server:

```bash
docker compose restart metal
```

You should see the following output in the console with the command `docker compose logs metal`:

```js
15:16:42 INFO  [Metal] root: --> connected to 'mdb-mflix (mflix)'
15:16:42 INFO  [Metal] root: --> connected to 'pg-clubdata (clubdata)'
15:16:45 DEBUG [Metal] root: --> Schedule.Start: Running job 'insert fake data to mflix.log'
15:16:45 DEBUG [Metal] root: --> Plans.RenderTable: fake-data.log : [{"insert":{"schema":"mflix","entity":"log","data":{"ts":"${{Date.now()}}","message":"This is a fake message ${{Math.random()}}","etl_status":"new"}}}]
15:16:45 DEBUG [Metal] root: Plan 'fake-data': '1',  {"insert":{"schema":"mflix","entity":"log","data":{"ts":"${{Date.now()}}","message":"This is a fake message ${{Math.random()}}","etl_status":"new"}}}
15:16:45 DEBUG [Metal] root: --> Plans.Insert: {"schema":"mflix","entity":"log","data":{"ts":"${{Date.now()}}","message":"This is a fake message ${{Math.random()}}","etl_status":"new"}}
15:16:45 DEBUG [Metal] root: Data.Insert: {"schema":"mflix","entity":"log","data":{"ts":"${{Date.now()}}","message":"This is a fake message ${{Math.random()}}","etl_status":"new"}}
15:16:45 DEBUG [Metal] root: <-- MongoDb.Insert: {"schema":"mflix","entity":"log","data":{"ts":"${{Date.now()}}","message":"This is a fake message ${{Math.random()}}","etl_status":"new"}}
15:16:45 DEBUG [Metal] root: --> Schedule.Start: Running job 'move data from mflix.log to clubdata.mflix_log'
15:16:45 DEBUG [Metal] root: --> Plans.RenderTable: move-data.mflix_log : [{"debug":null},{"update":{"schema":"mflix","entity":"log","filter":{"etl_status":"new"},"data":{"etl_status":"locked"}}},{"select":{"schema":"mflix","entity":"log","filter":{"etl_status":"locked"}}},{"fields":"ts, message"},{"insert":{"schema":"clubdata","entity":"mflix_log"}},{"delete":{"schema":"mflix","entity":"log","filter":{"etl_status":"locked"}}}]
15:16:45 DEBUG [Metal] root: Plan 'move-data': '1',  {"debug":null}
15:16:45 DEBUG [Metal] root: --> Plans.Debug: null
15:16:45 DEBUG [Metal] root: Plan 'move-data': '2',  {"update":{"schema":"mflix","entity":"log","filter":{"etl_status":"new"},"data":{"etl_status":"locked"}}}
15:16:45 DEBUG [Metal] root: --> Plans.Update: {"schema":"mflix","entity":"log","filter":{"etl_status":"new"},"data":{"etl_status":"locked"}}
15:16:45 DEBUG [Metal] root: Data.Update: {"schema":"mflix","entity":"log","filter":{"etl_status":"new"},"data":{"etl_status":"locked"}}
15:16:45 DEBUG [Metal] root: <-- MongoDb.Update: {"schema":"mflix","entity":"log","filter":{"etl_status":"new"},"data":{"etl_status":"locked"}}
15:16:45 DEBUG [Metal] root: --> MongoDb.Insert: {"schema":"mflix","entity":"log","data":{"ts":"${{Date.now()}}","message":"This is a fake message ${{Math.random()}}","etl_status":"new"}}
15:16:45 DEBUG [Metal] root: --> MongoDb.Update: {"schema":"mflix","entity":"log","filter":{"etl_status":"new"},"data":{"etl_status":"locked"}}
15:16:45 DEBUG [Metal] root: Plan 'move-data': '3',  {"select":{"schema":"mflix","entity":"log","filter":{"etl_status":"locked"}}}
15:16:45 DEBUG [Metal] root: --> Plans.Select: {"schema":"mflix","entity":"log","filter":{"etl_status":"locked"}}
15:16:45 DEBUG [Metal] root: Data.Select: {"schema":"mflix","entity":"log","filter":{"etl_status":"locked"}}
15:16:45 DEBUG [Metal] root: MongoDb.Select: {"schema":"mflix","entity":"log","filter":{"etl_status":"locked"}}
15:16:45 DEBUG [Metal] root: Plan 'move-data': '4',  {"fields":"ts, message"}
15:16:45 DEBUG [Metal] root: --> Plans.Fields: "ts, message"
15:16:45 DEBUG [Metal] root: Plan 'move-data': '5',  {"insert":{"schema":"clubdata","entity":"mflix_log"}}
15:16:45 DEBUG [Metal] root: --> Plans.Insert: {"schema":"clubdata","entity":"mflix_log"}
15:16:45 DEBUG [Metal] root: Data.Insert: {"schema":"clubdata","entity":"mflix_log","data":[{"ts":"1701348045019","message":"This is a fake message 0.07828487558371533"},{"ts":"1701353805011","message":"This is a fake message 0.2733102402643095"}]}
15:16:45 DEBUG [Metal] root: <-- Postgres.Insert: {"schema":"clubdata","entity":"mflix_log","data":[{"ts":"1701348045019","message":"This is a fake message 0.07828487558371533"},{"ts":"1701353805011","message":"This is a fake message 0.2733102402643095"}]}
15:16:45 DEBUG [Metal] root: Plan 'move-data': '6',  {"delete":{"schema":"mflix","entity":"log","filter":{"etl_status":"locked"}}}
15:16:45 DEBUG [Metal] root: --> Plans.Delete: {"schema":"mflix","entity":"log","filter":{"etl_status":"locked"}}
15:16:45 DEBUG [Metal] root: Data.Delete: {"schema":"mflix","entity":"log","filter":{"etl_status":"locked"}}
15:16:45 DEBUG [Metal] root: <-- MongoDb.Delete: {"schema":"mflix","entity":"log","filter":{"etl_status":"locked"}}
15:16:45 DEBUG [Metal] root: --> MongoDb.Delete: {"schema":"mflix","entity":"log","filter":{"etl_status":"locked"}}
```

## Playing with the HTTP API

To check if the data is transfered using the HTTP API, begin by logging in:

```bash
curl --request POST \
  --url http://127.0.0.1:3000/user/login \
  --header 'content-type: application/json' \
  --data '{"username":"myapiuser","password": "myStr@ngpa$$w0rd"}'
```

You should receive a response with a token:

```JSON
{
  "token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcwMTM1NDAyMSwiZXhwIjoxNzAxMzU3NjIxfQ.-RpBr9EFYt3AUKrJY4AGijUrZa3aD1TcgLJuqoX0h_Y"
}
```

Then, select data from the **mflix.log** table using the provided token after the "Bearer" prefix:

```bash
curl --request GET \
  --url http://127.0.0.1:3000/schema/mflix/log \
  --header 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcwMTM1NDAyMSwiZXhwIjoxNzAxMzU3NjIxfQ.-RpBr9EFYt3AUKrJY4AGijUrZa3aD1TcgLJuqoX0h_Y' \
  --header 'content-type: application/json'
```

You should receive the following response that shows a few rows or nothing:

```JSON
{
  "schema": "mflix",
  "entity": "log",
  "status": 200,
  "metadata": {},
  "fields": {
    "_id": "object",
    "ts": "string",
    "message": "string",
    "etl_status": "string"
  },
  "rows": [
    {
      "_id": "65689a9214f047918ccc6cc0",
      "ts": "1701354130008",
      "message": "This is a fake message 0.04520151149014229",
      "etl_status": "new"
    }
  ]
}
```

Then, select data from the **clubdata.mflix_log** table using the provided token after the "Bearer" prefix:

```bash
curl --request GET \
  --url http://127.0.0.1:3000/schema/clubdata/mflix_log \
  --header 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcwMTM1NDAyMSwiZXhwIjoxNzAxMzU3NjIxfQ.-RpBr9EFYt3AUKrJY4AGijUrZa3aD1TcgLJuqoX0h_Y' \
  --header 'content-type: application/json'
```

You should receive the following response that shows moved rows from the **mflix.log** table:

```JSON
{
  "schema": "clubdata",
  "entity": "mflix_log",
  "status": 200,
  "metadata": {},
  "fields": {
    "id": "number",
    "ts": "string",
    "message": "string"
  },
  "rows": [
    {
      "id": 1,
      "ts": "1701347540005",
      "message": "This is a fake message 0.9846309900288284"
    },
    {
      "id": 2,
      "ts": "1701347905011",
      "message": "This is a fake message 0.25353155070300826"
    },
    {
      "id": 3,
      "ts": "1701347910008",
      "message": "This is a fake message 0.9028579074682384"
    },
    {
      "id": 4,
      "ts": "1701347915011",
      "message": "This is a fake message 0.9755984982589525"
    },
    {
      "id": 5,
      "ts": "1701347920010",
      "message": "This is a fake message 0.36077359445840296"
    },
    {
      "id": 6,
      "ts": "1701347925017",
      "message": "This is a fake message 0.8778324449131703"
    },
    …
  ]
}
```

Feel free to explore and interact with the HTTP API using the provided example.

For additional details and comprehensive information, please consult the [API documentation](../documentation/rest-api.md).
