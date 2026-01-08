---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

<Badge type="default" text="Technical Guide"/>

# Schema with Plan Table

Plan tables in Metal function can acts as views in a Database Management System (DBMS). Metal provides the capability to create tables using Extract, Transform, Load (ETL) steps configured through the Plan command.

::: tip ℹ️ INFO
As of now, Metal Server exclusively supports only reading operations with Plan tables.
:::

## Prerequisites

Before testing this use case, ensure that the sample project is deployed and ready. (Refer to: [Sample project](../sample-project.md))

## Presentation

Consider having a database `northwind` with tables `orders` and `customers`. The objective is to create a view of orders by country sorted by **order_date** in ascending order.

Here are the steps to achieve this view (order-countries):

```mermaid
graph TD
B([begin])
-->
S[<span style="color:yellow">select</span> customer_id, order_id, order_date
<span style="color:yellow">from</span> <span style="color:red">northwind.orders</span>]
-->
J[<span style="color:yellow">left join</span> <span style="color:green">northwind.customers</span>
<span style="color:yellow">on</span> <span style="color:red">northwind.orders</span>.customer_id <span style="color:yellow">=</span> <span style="color:green">northwind.customers</span>.customer_id]
-->
F[<span style="color:yellow">select</span> order_id, order_date, country]
-->
X[<span style="color:yellow">order by</span> order_date <span style="color:yellow">asc</span>]
-->
E([end])
```

The goal is to configure this plan and expose it through an HTTP API.

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
```

In this configuration, we:

- Set the Metal server port to 3000/TCP with `port: 3000`
- Enable authentication with `authentication:`
- Limit the maximum response size to 100 Mbytes with `request-limit: 100mb`

Add a users section with the user `myapiuser`:

```yaml
roles:
  all: crudla
users:
  myapiuser:
	  password: myStr@ngpa$$w0rd
```

Include a sources section with the source `pg-northwind` to connect to the database `northwind`:

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

Next, configure a plan section with the plan `p-order-countries` with an entity named `order-countries`:

```yaml
plans:
  p-order-countries:
    order-countries:
```

Inside `order-countries`, add the steps as presented in the article to achieve the view:

```yaml
plans:
  p-order-countries:
    order-countries:
      - select:
          schema: northwind
          entity: orders
          fields: customer_id, order_id, order_date
      - join:
          type: left
          schema: northwind
          entity: customers
          left-field: customer_id
          right-field: customer_id
      - fields: order_id, order_date, country
      - sort:
          order_date: asc
```

| Block                                                                                                                                                                                                                                                                                                     | Step command                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| <span style="color:yellow">select</span> customer_id, order_id, order_date <br> <span style="color:yellow">from</span> <span style="color:red">northwind.orders</span>                                                                                                                                    | <pre>- select:<br> schema: northwind<br> entity: orders<br> fields: customer_id, order_id, order_date<br> </pre>                       |
| <span style="color:yellow">left join</span> <span style="color:green">northwind.customers</span><br><span style="color:yellow">on</span> <span style="color:red">northwind.orders</span>.customer_id <span style="color:yellow">=</span> <span style="color:green">northwind.customers</span>.customer_id | <pre>- join:<br> type: left<br> schema: northwind<br> entity: customers<br> left-field: customer_id<br> right-field: customer_id</pre> |
| <span style="color:yellow">select</span> order_id, order_date, country                                                                                                                                                                                                                                    | <pre>- fields: order_id, order_date, country</pre>                                                                                     |
| <span style="color:yellow">order by</span> order_date <span style="color:yellow">asc</span>                                                                                                                                                                                                               | <pre>- sort:<br> order_date: asc</pre>                                                                                                 |

::: tip ℹ️ INFO
For more information about using plans, please refer to: [Configuration File Reference (Section Plans)](../documentation/config-yml.md#plans).
:::

Add source `plan-order-countries` to the `sources` section to point to the plan `p-order-countries`:

```yaml
sources:
  plan-order-countries:
    provider: plan
    database: p-order-countries
```

Now that the plan is configured, modify the schema `northwind` to link it to the plan `p-order-countries`, entity `order-countries`, using the command `entities`:

```yaml
schemas:
  northwind:
    source: pg-northwind
    entities:
      order-countries:
        source: plan-order-countries
        entity: order-countries
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
  plan-order-countries:
    provider: plan
    database: p-order-countries

schemas:
  northwind:
    source: pg-northwind
    entities:
      order-countries:
        source: plan-order-countries
        entity: order-countries

plans:
  p-order-countries:
    order-countries:
      - select:
          schema: northwind
          entity: orders
          fields: customer_id, order_id, order_date
      - join:
          type: left
          schema: northwind
          entity: customers
          left-field: customer_id
          right-field: customer_id
      - fields: order_id, order_date, country
      - sort:
          order_date: asc
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
  "token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcwMTA5MTg3MCwiZXhwIjoxNzAxMDk1NDcwfQ.VN_OLogWUkz8TDG01woMHDe9ClP97EqpFsee9k4vuK4"
}
```

Then, select data from the "order-countries" table using the provided token after the "Bearer" prefix:

```bash
curl --request GET \
  --url http://127.0.0.1:3000/schema/northwind/order-countries \
  --header 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcwMTA5MTg3MCwiZXhwIjoxNzAxMDk1NDcwfQ.VN_OLogWUkz8TDG01woMHDe9ClP97EqpFsee9k4vuK4' \
  --header 'content-type: application/json'
```

You should receive the following response:

```JSON
{
  "schema": "northwind",
  "entity": "order-countries",
  "status": 200,
  "metadata": {},
  "fields": {
    "order_id": "number",
    "order_date": "object",
    "country": "string"
  },
  "rows": [
    {
      "order_id": 10248,
      "order_date": "1996-07-04T00:00:00.000Z",
      "country": "France"
    },
    {
      "order_id": 10249,
      "order_date": "1996-07-05T00:00:00.000Z",
      "country": "Germany"
    },
    {
      "order_id": 10250,
      "order_date": "1996-07-08T00:00:00.000Z",
      "country": "Brazil"
    },
    …
  ]
}
```

Feel free to explore and interact with the HTTP API using the provided example.

For additional details and comprehensive information, please consult the [API documentation](../documentation/rest-api.md).
