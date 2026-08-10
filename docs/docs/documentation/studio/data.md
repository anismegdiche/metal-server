---
description: "Manage sources, schemas and browse data from Studio"
---

# Data

The Data screen lets you manage **sources** and **schemas**, and browse the data they expose. It corresponds to the `sources` and `schemas` sections of the [configuration file](../config-yml#sources).

## Sources

The Sources panel lists every configured source with its provider, host and database.

- **Add Source** — create a new source. Studio provides a dedicated form for each provider (PostgreSQL, MySQL, MS SQL, Azure SQL DB, MongoDB, Azure Cosmos DB, Storage, Plans, Web Service, Metal Server, Memory), with the same options as the YAML configuration.
- **Edit** — modify an existing source.
- **Delete** — remove a source.

See [Data Providers Configurations](../data-providers-config) for the provider options.

## Schemas

The Schemas panel lists every configured schema and the number of entities it exposes.

- **Add Schema** — create a new schema and attach it to a source.
- **Edit** — change the source or entities of a schema.
- **Delete** — remove a schema.

See [Configuration File Reference: schemas](../config-yml#schemas) for the schema declaration.

## Data Browser

The data browser lets you navigate your sources and schemas, list entities and view their data directly from Studio — a visual counterpart of the [`/schema/...` REST API](../rest-api).
