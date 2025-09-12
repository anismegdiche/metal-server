---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---
<Badge type="default" text="Technical Guide"/>

# Microservice HTTP Middleware

Dealing with monolithic applications can be a challenging task, especially when it comes to upgrading specific code portions or databases. The microservices architecture pattern offers a solution by logically separating a traditional application into multiple services. However, the transition from a monolithic structure to a microservices architecture requires effective development practices and seamless migration strategies.

Metal provides specialized features to tackle database communications through its HTTP middleware.

In this use case, we demonstrate deploying the Metal server as an HTTP middleware, consolidating multiple Database Management Systems (DBMS) as if they were a unified database.

::: tip ℹ️ INFO
As of now, Metal Server exclusively supports CRUD operations.
:::

## Prerequisites

Before testing this use case, make sure that the sample project is deployed and ready. (Refer to: [Sample project](../sample-project.md))

## Presentation

Imagine an application communicating with the Metal server as an HTTP API bridge with a Postgres Database:

```mermaid
graph LR
Application -- HTTP/HTTPS --> Metal
Metal -- Message-based protocol --> clubdata
```

Here, **clubdata** is a Postgres Database containing tables: **members, facilities, and bookings**.

After separating your application into multiple services, one for each table, you are still essentially addressing the same DBMS at the backend:

```mermaid
graph LR
NGINX --> MembersService
NGINX --> FacilitiesService
NGINX --> BookingsService
MembersService -- HTTP/HTTPS --> Metal
FacilitiesService -- HTTP/HTTPS --> Metal
BookingsService -- HTTP/HTTPS --> Metal
Metal -- Message-based protocol --> clubdata
```

At this point, even if the database is split into multiple Postgres servers, each one holding a table, the configuration becomes straightforward:

```mermaid
graph LR
NGINX --> MembersService
NGINX --> FacilitiesService
NGINX --> BookingsService
MembersService -- HTTP/HTTPS --> Metal
FacilitiesService -- HTTP/HTTPS --> Metal
BookingsService -- HTTP/HTTPS --> Metal
Metal -- Message-based protocol --> clubdata,members
Metal -- Message-based protocol --> clubdata,facilities
Metal -- Message-based protocol --> clubdata,bookings
```

This configuration is easily manageable with Metal Server.

In the following, we assume these DBMS configurations:

| Host                   | Port | User  | Password | Database | Tables     |
| ---------------------- | ---- | ----- | -------- | -------- | ---------- |
| pg-clubdata-members    | 5432 | admin | 123456   | clubdata | members    |
| pg-clubdata-facilities | 5432 | admin | 123456   | clubdata | facilities |
| pg-clubdata-bookings   | 5432 | admin | 123456   | clubdata | bookings   |

The goal is to expose the tables **members**, **facilities**, and **bookings** through an HTTP API using Metal.

## Configuration

Let's start with a minimal Metal configuration file, `config.yml`:

```yaml
version: "0.3"
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

Include a sources section with the sources `pg-clubdata-members`, `pg-clubdata-facilities`, and `pg-clubdata-bookings` to connect to their databases `clubdata`:

```yaml
sources:
  pg-clubdata-bookings:
    provider: postgres
    host: pg-clubdata-bookings
    port: 5432
    user: admin
    password: "123456"
    database: clubdata
  pg-clubdata-facilities:
    provider: postgres
    host: pg-clubdata-facilities
    port: 5432
    user: admin
    password: "123456"
    database: clubdata
  pg-clubdata-members:
    provider: postgres
    host: pg-clubdata-members
    port: 5432
    user: admin
    password: "123456"
    database: clubdata
```

To expose through an HTTP API, add a schema section with the schema `clubdata` that points to the tables **members**, **facilities**, and **bookings** from their sources:

```yaml
schemas:
  clubdata:
    entities:
      members:
        source: pg-clubdata-members
        entity: members
      facilities:
        source: pg-clubdata-facilities
        entity: facilities
      bookings:
        source: pg-clubdata-bookings
        entity: bookings
```

With the `entities` command, we define tables to expose and their exposed names.

The final configuration will be:

```yaml
version: "0.3"
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
  pg-clubdata-bookings:
    provider: postgres
    host: pg-clubdata-bookings
    port: 5432
    user: admin
    password: "123456"
    database: clubdata
  pg-clubdata-facilities:
    provider: postgres
    host: pg-clubdata-facilities
    port: 5432
    user: admin
    password: "123456"
    database: clubdata
  pg-clubdata-members:
    provider: postgres
    host: pg-clubdata-members
    port: 5432
    user: admin
    password: "123456"
    database: clubdata
schemas:
  clubdata:
    entities:
      members:
        source: pg-clubdata-members
        entity: members
      facilities:
        source: pg-clubdata-facilities
        entity: facilities
      bookings:
        source: pg-clubdata-bookings
        entity: bookings
```

With the configuration set, restart the Metal server:

```bash
docker compose restart metal
```

## Playing with the HTTP API

To test the HTTP API, begin by logging in:

```bash
curl --request POST \
  --url http://localhost:3000/user/login \
  --header 'content-type: application/json' \
  --data '{"username":"myapiuser","password": "myStr@ngpa$$w0rd"}'
```

You should receive a response with a token:

```JSON
{
  "token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcwMDY0NzM4OCwiZXhwIjoxNzAwNjUwOTg4fQ.lcRcJBOWC6BiYL

pR2EiWNWwWSyyLIoMSnzVHAy3SWlE"
}
```

Then, select data from the "members" table using the provided token after the "Bearer" prefix:

```bash
curl --request GET \
  --url http://localhost:3000/schema/clubdata/members \
  --header 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcwMDY0NzM4OCwiZXhwIjoxNzAwNjUwOTg4fQ.lcRcJBOWC6BiYLpR2EiWNWwWSyyLIoMSnzVHAy3SWlE' \
  --header 'content-type: application/json'
```

You should receive the following response:

```JSON
{
  "schema": "clubdata",
  "entity": "members",
  "status": 200,
  "metadata": {},
  "fields": {
    "memid": "number",
    "surname": "string",
    "firstname": "string",
    "address": "string",
    "zipcode": "number",
    "telephone": "string",
    "recommendedby": "object",
    "joindate": "object"
  },
  "rows": [
    {
      "memid": 0,
      "surname": "GUEST",
      "firstname": "GUEST",
      "address": "GUEST",
      "zipcode": 0,
      "telephone": "(000) 000-0000",
      "recommendedby": null,
      "joindate": "2012-07-01T00:00:00.000Z"
    },
    {
      "memid": 1,
      "surname": "Smith",
      "firstname": "Darren",
      "address": "8 Bloomsbury Close, Boston",
      "zipcode": 4321,
      "telephone": "555-555-5555",
      "recommendedby": null,
      "joindate": "2012-07-02T12:02:05.000Z"
    },
    {
      "memid": 2,
      "surname": "Smith",
      "firstname": "Tracy",
      "address": "8 Bloomsbury Close, New York",
      "zipcode": 4321,
      "telephone": "555-555-5555",
      "recommendedby": null,
      "joindate": "2012-07-02T12:08:23.000Z"
    },
    …
  ]
}
```

Then, select data from the "facilities" table using the provided token after the "Bearer" prefix:

```bash
curl --request GET \
  --url http://localhost:3000/schema/clubdata/facilities \
  --header 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcwMDY0NzM4OCwiZXhwIjoxNzAwNjUwOTg4fQ.lcRcJBOWC6BiYLpR2EiWNWwWSyyLIoMSnzVHAy3SWlE' \
  --header 'content-type: application/json'
```

You should receive the following response:

```JSON
{
  "schema": "clubdata",
  "entity": "facilities",
  "status": 200,
  "metadata": {},
  "fields": {
    "facid": "number",
    "name": "string",
    "membercost": "string",
    "guestcost": "string",
    "initialoutlay": "string",
    "monthlymaintenance": "string"
  },
  "rows": [
    {
      "facid": 0,
      "name": "Tennis Court 1",
      "membercost": "5",
      "guestcost": "25",
      "initialoutlay": "10000",
      "monthlymaintenance": "200"
    },
    {
      "facid": 1,
      "name": "Tennis Court 2",
      "membercost": "5",
      "guestcost": "25",
      "initialoutlay": "8000",
      "monthlymaintenance": "200"
    },
    {
      "facid": 2,
      "name": "Badminton Court",
      "membercost": "0",
      "guestcost": "15.5",
      "initialoutlay": "4000",
      "monthlymaintenance": "50"
    },
    …
  ]
}
```

Then, select data from the "bookings" table using the provided token after the "Bearer" prefix:

```bash
curl --request GET \
  --url http://localhost:3000/schema/clubdata/bookings \
  --header 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcwMDY0NzM4OCwiZXhwIjoxNzAwNjUwOTg4fQ.lcRcJBOWC6BiYLpR2EiWNWwWSyyLIoMSnzVHAy3SWlE' \
  --header 'content-type: application/json'
```

You should receive the following response:

```JSON
{
  "schema": "clubdata",
  "entity": "bookings",
  "status": 200,
  "metadata": {},
  "fields": {
    "bookid": "number",
    "facid": "number",
    "memid": "number",
    "starttime": "object",
    "slots": "number"
  },
  "rows": [
    {
      "bookid": 0,
      "facid": 3,
      "memid": 1,
      "starttime": "2012-07-03T11:00:00.000Z",
      "slots": 2
    },
    {
      "bookid": 1,
      "facid": 4,
      "memid": 1,
      "starttime": "2012-07-03T08:00:00.000Z",
      "slots": 2
    },
    {
      "bookid": 2,
      "facid": 6,
      "memid": 0,
      "starttime": "2012-07-03T18:00:00.000Z",
      "slots": 2
    },
    …
  ]
}
```

Feel free to explore and interact with the HTTP API using the provided example.

For additional details and comprehensive information, please consult the [API documentation](../documentation/rest-api.md).