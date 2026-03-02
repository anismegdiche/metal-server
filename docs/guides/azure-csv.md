---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

<Badge type="default" text="Technical Guide"/>

# Transforming Azure Blob CSV Files into Data Tables

This use case demonstrates how to transform CSV files stored in Azure Blob Storage into data tables that can be easily accessed and manipulated. By leveraging the power of Metal Server, you can efficiently manage and analyze large datasets, enabling seamless integration with various applications and workflows.

::: tip ℹ️ INFO
Currently, Metal Server supports CRUD operations exclusively.
:::

## Prerequisites

Before proceeding, ensure that the sample project is deployed and ready. (Refer to: [Sample project](../sample-project.md))

## Presentation

::: tip ℹ️ INFO
For demonstration purposes, Azurite has been used as an Azure Blob simulator.
:::

Consider an Azure Blob Storage with the following configuration:

- **Container**: `datacontainer1`
- **Connection String**: `UseDevelopmentStorage=true`

Containing a CSV file named **addresses.csv** with the following columns:

| Columns   |
| --------- |
| Firstname |
| Lastname  |
| Address   |
| City      |
| Code      |
| ZipCode   |

The objective is to expose this CSV file through an HTTP API using Metal.

## Configuration

Begin with a minimal Metal configuration file, `config.yml`:

```yaml
version: "0.5"
server:
  port: 3000
  authentication:
    type: local
    default-role: all
  request-limit: 100mb
```

In this configuration:

- The Metal server port is set to 3000/TCP.
- Authentication is enabled.
- The maximum response size is limited to 100 MB.

Add a users section with the user `myapiuser`:

```yaml
roles:
  all: crudla
users:
  myapiuser:
	  password: myStr@ngpa$$w0rd
```

Include a sources section with the source `azure-csv-data` to connect to the Azure Blob Container `datacontainer1`:

```yaml
sources:
  azure-csv-data:
    provider: storage
    options:
      storage-mode: files
      storage-type: azure-blob
      connection-string: UseDevelopmentStorage=true
      container: datacontainer1
      content:
        "*.csv":
          content-type: csv
```

In this configuration:

- The provider is set to files.
- The storage type is set to Azure Blob.
- The content type is set to CSV.
- The Azure Blob Connection string is set to local Azurite.
- The Azure Blob Container name is set to `datacontainer1`.

To expose through an HTTP API, add a schema section with the schema `azcsv` that points to the source `azure-csv-data`:

```yaml
schemas:
  azcsv:
    source: azure-csv-data
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
  azure-csv-data:
    provider: storage
    options:
      storage-mode: files
      storage-type: azure-blob
      connection-string: UseDevelopmentStorage=true
      container: datacontainer1
      content:
        '*.csv':
          content-type: csv

schemas:
  azcsv:
    source: azure-csv-data
```

With the configuration set, restart the Metal server:

```bash
docker compose restart metal
```

## Interacting with the HTTP API

First, log in to obtain a token:

```bash
curl --request POST \
  --url http://127.0.0.1:3000/user/login \
  --header 'content-type: application/json' \
  --data '{"username":"myapiuser","password": "myStr@ngpa$$w0rd"}'
```

You should receive a response with a token:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcyMDg3MjU0OSwiZXhwIjoxNzIwODc2MTQ5fQ.VsVCPpIB9lEAb1fUgzRnzwV-IeDeVLu7BykW4EzNYfo"
}
```

Use the token to select data from the **addresses.csv** table:

```bash
curl --request GET \
  --url http://127.0.0.1:3000/schema/azcsv/addresses.csv \
  --header 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcyMDg3MjU0OSwiZXhwIjoxNzIwODc2MTQ5fQ.VsVCPpIB9lEAb1fUgzRnzwV-IeDeVLu7BykW4EzNYfo' \
  --header 'content-type: application/json'
```

You should receive the following response:

```json
{
  "schema": "azcsv",
  "entity": "addresses.csv",
  "status": 200,
  "metadata": {},
  "fields": {
    "Firstname": "string",
    "Lastname": "string",
    "Address": "string",
    "City": "string",
    "Code": "string",
    "ZipCode": "string"
  },
  "rows": [
    {
      "Firstname": "John",
      "Lastname": "Doe",
      "Address": "120 jefferson st.",
      "City": "Riverside",
      "Code": " NJ",
      "ZipCode": " 08075"
    },
    {
      "Firstname": "Jack",
      "Lastname": "McGinnis",
      "Address": "220 hobo Av.",
      "City": "Phila",
      "Code": " PA",
      "ZipCode": "09119"
    },
    {
      "Firstname": "John \"Da Man\"",
      "Lastname": "Repici",
      "Address": "120 Jefferson St.",
      "City": "Riverside",
      "Code": " NJ",
      "ZipCode": "08075"
    },
    …
  ]
}
```

To add a field **Country** with value **USA** for all rows:

```bash
curl --request PATCH \
  --url http://127.0.0.1:3000/schema/azcsv/addresses.csv \
  --header 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcyMDg3MjU0OSwiZXhwIjoxNzIwODc2MTQ5fQ.VsVCPpIB9lEAb1fUgzRnzwV-IeDeVLu7BykW4EzNYfo' \
  --header 'content-type: application/json' \
  --data '{"data": {"Country": "USA"}}'
```

To verify that the modification has been applied:

```bash
curl --request GET \
  --url http://127.0.0.1:3000/schema/azcsv/addresses.csv \
  --header 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im15YXBpdXNlciIsImlhdCI6MTcyMDg3MjU0OSwiZXhwIjoxNzIwODc2MTQ5fQ.VsVCPpIB9lEAb1fUgzRnzwV-IeDeVLu7BykW4EzNYfo' \
  --header 'content-type: application/json'
```

You should receive the following response:

```json
{
  "schema": "azcsv",
  "entity": "addresses.csv",
  "status": 200,
  "metadata": {},
  "fields": {
    "Firstname": "string",
    "Lastname": "string",
    "Address": "string",
    "City": "string",
    "Code": "string",
    "ZipCode": "string",
    "Country": "string"
  },
  "rows": [
    {
      "Firstname": "John",
      "Lastname": "Doe",
      "Address": "120 jefferson st.",
      "City": "Riverside",
      "Code": " NJ",
      "ZipCode": " 08075",
      "Country": "USA"  <--------------------- Added field
    },
    {
      "Firstname": "Jack",
      "Lastname": "McGinnis",
      "Address": "220 hobo Av.",
      "City": "Phila",
      "Code": " PA",
      "ZipCode": "09119",
      "Country": "USA"  <--------------------- Added field
    },
    {
      "Firstname": "John \"Da Man\"",
      "Lastname": "Repici",
      "Address": "120 Jefferson St.",
      "City": "Riverside",
      "Code": " NJ",
      "ZipCode": "08075",
      "Country": "USA"  <--------------------- Added field
    },
    …
  ]
}
```

Feel free to explore and interact with the HTTP API using the provided example.

For additional details and comprehensive information, please consult the [API documentation](../documentation/rest-api.md).
