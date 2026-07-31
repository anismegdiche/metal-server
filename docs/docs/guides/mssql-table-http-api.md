---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

<Badge type="default" text="Technical Guide"/>

# Exposing Selected Tables from MS SQL Server through HTTP API

When securing access to a database, especially when concealing tables from connected users, Metal provides functionality to selectively expose required tables.

This use case illustrates how to expose specific tables from a MS SQL Server database.

::: tip ℹ️ INFO
As of now, Metal Server is exclusively designed for CRUD operations.
:::

## Prerequisites

Before testing this use case, ensure that the sample project is deployed and ready. (Please refer to: [Sample project](../sample-project.md))

## Presentation

Consider an MS SQL Server database named `hr` with the following configuration:

- Host: ms-hr
- Port: 1433
- User: sa
- Password: Azerty123!
- Database: hr

The database contains the following tables:

| Tables      |
| ----------- |
| regions     |
| countries   |
| locations   |
| jobs        |
| departments |
| employees   |
| dependents  |

The goal is to expose the tables **locations** and **countries** through an HTTP API using Metal.

## Configuration

Let's begin with a minimal Metal configuration file, `config.yml`:

```yaml
version: "0.5"
server:
  port: 3000
  authentication:
    type: local
    default-role: all
  request-limit: 100mb
```

In this configuration, we have:

- Set the Metal server port to 3000/TCP with `port: 3000`
- Enabled authentication with `authentication:`
- Limited the maximum response size to 100 Mbytes with `request-limit: 100mb`

Add a users section with the user `myapiuser`:

```yaml
roles:
  all: crudla
users:
  myapiuser:
	  password: myStr@ngpa$$w0rd
```

Include a sources section with the source `ms-hr` to connect to the database "hr":

```yaml
sources:
  ms-hr:
    provider: mssql
    host: ms-hr
    port: 1433
    user: sa
    password: Azerty123!
    database: hr
```

To expose through an HTTP API, add a schema section with the schema `hr` that points to the tables **locations** and **countries** from `ms-hr`:

```yaml
schemas:
  hr:
    entities:
      locations:
        source: ms-hr
        entity: locations
      countries:
        source: ms-hr
        entity: countries
```

With the `entities` command, we define tables to expose and their exposed names.

::: tip ℹ️ TIP
It is possible to expose a different name from the original table name.
:::

The final configuration will be:

```yaml
version: "0.5"
server:
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
  ms-hr:
    provider: mssql
    host: ms-hr
    port: 1433
    user: sa
    password: Azerty123!
    database: hr
schemas:
  hr:
    entities:
      locations:
        source: ms-hr
        entity: locations
      countries:
        source: ms-hr
        entity: countries
```

With the configuration set, restart the Metal server:

```bash
docker compose restart metal
```

## Playing with the HTTP API

To test the HTTP API, begin by logging in:

```bash
curl --request POST \
  --url http://127.0.0.1:3000/user/login \
  --header 'content-type: application/json' \
  --data '{"username":"myapiuser","password": "myStr@ngpa$$w0rd"}'
```

You should receive a response with a token:

```JSON
{
  "token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcwMDU4MDcxMywiZXhwIjoxNzAwNTg0MzEzfQ.GL0k-HM6T-Htp6ypcFnXEZxLacGLGOlYjfdAIO1a2cU"
}
```

Then, select data from the "countries" table using the provided token after the "Bearer" prefix:

```bash
curl --request GET \
  --url http://127.0.0.1:3000/schema/hr/countries \
  --header 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcwMDU4MDcxMywiZXhwIjoxNzAwNTg0MzEzfQ.GL0k-HM6T-Htp6ypcFnXEZxLacGLGOlYjfdAIO1a2cU' \
  --header 'content-type: application/json'
```

You should receive the following response:

```JSON
{
  "schema": "hr",
  "entity": "countries",
  "status": 200,
  "metadata": {},
  "fields": {
    "country_id": "string",
    "country_name": "string",
    "region_id": "number"
  },
  "rows": [
    {
      "country_id": "AR",
      "country_name": "Argentina",
      "region_id": 2
    },
    {
      "country_id": "AU",
      "country_name": "Australia",
      "region_id": 3
    },
    {
      "country_id": "BE",
      "country_name": "Belgium",
      "region_id": 1
    },
    …
  ]
}
```

Then, select data from the "locations" table using the provided token after the "Bearer" prefix:

```bash
curl --request GET \
  --url http://127.0.0.1:3000/schema/hr/locations \
  --header 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcwMDU4MDcxMywiZXhwIjoxNzAwNTg0MzEzfQ.GL0k-HM6T-Htp6ypcFnXEZxLacGLGOlYjfdAIO1a2cU' \
  --header 'content-type: application/json'
```

You should receive the following response:

```JSON
{
  "schema": "hr",
  "entity": "locations",
  "status": 200,
  "metadata": {},
  "fields": {
    "location_id": "number",
    "street_address": "string",
    "postal_code": "string",
    "city": "string",
    "state_province": "string",
    "country_id": "string

"
  },
  "rows": [
    {
      "location_id": 1400,
      "street_address": "2014 Jabberwocky Rd",
      "postal_code": "26192",
      "city": "Southlake",
      "state_province": "Texas",
      "country_id": "US"
    },
    {
      "location_id": 1500,
      "street_address": "2011 Interiors Blvd",
      "postal_code": "99236",
      "city": "South San Francisco",
      "state_province": "California",
      "country_id": "US"
    },
    {
      "location_id": 1700,
      "street_address": "2004 Charade Rd",
      "postal_code": "98199",
      "city": "Seattle",
      "state_province": "Washington",
      "country_id": "US"
    },
    …
  ]
}
```

Because only **locations** and **countries** are exposed, attempting to query **jobs**:

```bash
curl --request GET \
  --url http://127.0.0.1:3000/schema/hr/jobs \
  --header 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcwMDU4MDcxMywiZXhwIjoxNzAwNTg0MzEzfQ.GL0k-HM6T-Htp6ypcFnXEZxLacGLGOlYjfdAIO1a2cU' \
  --header 'content-type: application/json'
```

results in a 404 response because the table **jobs** is not exposed:

```JSON
{
  "schema": "hr",
  "entity": "jobs",
  "status": 404
}
```

Feel free to explore and interact with the HTTP API using the provided example.

For additional details and comprehensive information, please consult the [API documentation](../documentation/rest-api.md).
