---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

<Badge type="default" text="Technical Guide"/>

# PostgreSQL Database HTTP API

When speed is of the essence for deploying an API, Metal provides a swift solution that can be up and running within seconds.

This use case demonstrates how to deploy an HTTP API in front of a PostgreSQL database, facilitating CRUD (Create, Read, Update, Delete) operations. This approach is particularly valuable when developing web applications that require seamless communication with a database.

::: tip ℹ️ INFO
As of now, Metal Server is exclusively designed for CRUD operations.
:::

## Prerequisites

Before testing this use case, ensure that the sample project is deployed and ready. (Please refer to: [Sample project](../sample-project))

## Presentation

Consider a PostgreSQL database named "northwind" with the following configuration:

- Host: pg-northwind
- Port: 5432
- User: admin
- Password: 123456
- Database: northwind

The database contains the following tables:

| Tables                 |
| ---------------------- |
| territories            |
| order_details          |
| employee_territories   |
| us_states              |
| customers              |
| orders                 |
| employees              |
| shippers               |
| products               |
| categories             |
| suppliers              |
| region                 |
| customer_demographics  |
| customer_customer_demo |

The goal is to expose this database through an HTTP API using Metal.

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

Include a sources section with the source `pg-northwind` to connect to the database "northwind":

```yaml
sources:
  pg-northwind:
    provider: postgres
    host: pg-northwind
    port: 5432
    user: admin
    password: "123456"
    database: northwind
```

To expose through an HTTP API, add a schema section with the schema `northwind` that points to the source `pg-northwind`:

```yaml
schemas:
  northwind:
    source: pg-northwind
```

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
  pg-northwind:
    provider: postgres
    host: pg-northwind
    port: 5432
    user: admin
    password: "123456"
    database: northwind
schemas:
  northwind:
    source: pg-northwind
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
    "token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcwMDU3NTA2NCwiZXhwIjoxNzAwNTc4NjY0fQ.OaA9I35HVgmxRzy3cTyaGR3mjd1tf0xYRdHlE7BtYS0"
}
```

Then, select data from the "customers" table using the provided token after the "Bearer" prefix:

```bash
curl --request GET \
  --url http://127.0.0.1:3000/schema/northwind/customers \
  --header 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcwMDU3NTA2NCwiZXhwIjoxNzAwNTc4NjY0fQ.OaA9I35HVgmxRzy3cTyaGR3mjd1tf0xYRdHlE7BtYS0' \
  --header 'content-type: application/json'
```

You should receive the following response:

```JSON
{
	"schema": "northwind",
	"entity": "customers",
	"status": 200,
	"metadata": {},
	"fields": {
		"customer_id": "string",
		"company_name": "string",
		"contact_name": "string",
		"contact_title": "string",
		"address": "string",
		"city": "string",
		"region": "object",
		"postal_code": "string",
		"country": "string",
		"phone": "string",
		"fax": "string"
	},
	"rows": [
		{
			"customer_id": "ALFKI",
			"company_name": "Alfreds Futterkiste",
			"contact_name": "Maria Anders",
			"contact_title": "Sales Representative",
			"address": "Obere Str. 57",
			"city": "Berlin",
			"region": null,
			"postal_code": "12209",
			"country": "Germany",
			"phone": "030-0074321",
			"fax": "030-0076545"
		},
		{
			"customer_id": "ANATR",
			"company_name": "Ana Trujillo Emparedados y helados",
			"contact_name": "Ana Trujillo",
			"contact_title": "Owner",
			"address": "Avda. de la Constitución 2222",
			"city": "México D.F.",
			"region": null,
			"postal_code": "05021",
			"country": "Mexico",
			"phone": "(5) 555-4729",
			"fax": "(5) 555-3745"
		},
		{
			"customer_id": "ANTON",
			"company_name": "Antonio Moreno Taquería",
			"contact_name": "Antonio Moreno",
			"contact_title": "Owner",
			"address": "Mataderos 2312",
			"city": "México D.F.",
			"region": null,
			"postal_code": "05023",
			"country": "Mexico",
			"phone": "(5) 555-3932",
			"fax": null
		},
		…
	]
}
```

Feel free to explore and interact with the HTTP API using the provided example.

For additional details and comprehensive information, please consult the [API documentation](../documentation/rest-api).
