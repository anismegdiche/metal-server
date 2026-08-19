# FakeData Provider Specification

## 1. Purpose

`FakeData` is a Metal data provider that generates deterministic synthetic records from a declarative source configuration. It extends the `memory` provider and pre-populates its in-memory DataBase with generated data.

It is intended for:

- Testing ETL Plans without external databases or services.
- Testing MCP Tools against safe, isolated data.
- Developing schemas and transformations locally.
- Reproducing test failures with a fixed seed.
- Running lightweight integration tests in CI.

`FakeData` is not intended to emulate a complete relational database or production data relationships.

## 2. Metal Integration

Metal concepts remain unchanged:

```text
FakeData Source → Entities → Fields → Metal Schema → Plan / MCP Tool
```

`FakeData` is a source provider. It does not introduce a new schema type, Plan type, or MCP-specific configuration.

The provider exposes entities and fields. Metal schemas expose those entities to users, Plans, and MCP Tools.

Internally, `FakeData` extends `MemoryData` and uses its in-memory `DataBase` (DuckDB). During `Connect`, it generates fake rows for each configured entity and stores them as `DataTable` instances in the DataBase. All subsequent `Select`, `Insert`, `Update`, and `Delete` operations are delegated to `MemoryData`.

## 3. Provider Identifier

Add the provider identifier to `DATA_PROVIDER` in `apps/server/src/modules/source/@consts.ts`:

```ts
export enum DATA_PROVIDER {
	METAL = "metal",
	PLANS = "plans",
	MEMORY = "memory",
	POSTGRES = "postgres",
	MONGODB = "mongodb",
	MSSQL = "mssql",
	MYSQL = "mysql",
	WEBSERVICE = "webservice",
	AZURE_COSMOSDB = "azure-cosmosdb",
	AZURE_SQLDB = "azure-sqldb",
	STORAGE = "storage",
	FAKE_DATA = "fake-data",
}
```

The canonical configuration value is `fake-data`.

### Integration points

The new provider must be registered in these places:

1. **Enum** — `DATA_PROVIDER.FAKE_DATA` in `apps/server/src/modules/source/@consts.ts`
2. **Source config schema** — new `U__source_fake_data.ts` in `apps/server/src/modules/source/types/`
3. **Discriminated union** — add `z_U__source_fake_data` to `z_U__sources_source` in `apps/server/src/modules/core/types/U__sources.ts`
4. **Provider factory** — add entry to `DataProvider.#providerMap` in `apps/server/src/modules/source/DataProvider.ts`

## 4. Source Configuration

`FakeData` uses a simplified YAML format. Each field is a `@faker-js/faker` expression string. The `seed` is set at source level; `locale` and `rows` are set per entity.

```yaml
sources:
  fake-crm:
    provider: fake-data
    options:
      seed: 42
      autocreate: true
      entities:
        customers:
          locale: en
          rows: 100
          fields:
            id: string.uuid
            firstName: person.firstName
            lastName: person.lastName
            email: internet.email
            age: "number.int({ min: 10, max: 100 })"
            active: datatype.boolean
            createdAt: date.anytime
        books:
          locale: fr
          rows: 45
          fields:
            id: string.uuid
            title: "person.firstName('male')"
            author: person.lastName
            publishedAt: date.anytime
```

### Source config zod schema

```ts
// apps/server/src/modules/source/types/U__source_fake_data.ts
import z from "zod"
import { DATA_PROVIDER } from "../@consts"

const z_fake_data_entity = z.object({
	locale: z.string().default("en").optional(),
	rows: z.number().int().min(0).default(100).optional(),
	fields: z.record(z.string(), z.string()).optional(),
})

export const z_U__source_fake_data_options = z.object({
	seed: z.number().int().optional(),
	autocreate: z.boolean().default(true).optional(),
	entities: z.record(z.string(), z_fake_data_entity).min(1),
})

export const z_U__source_fake_data = z.object({
	provider: z.literal(DATA_PROVIDER.FAKE_DATA).default(DATA_PROVIDER.FAKE_DATA),
	options: z_U__source_fake_data_options,
})

export type U__source_fake_data_options = z.infer<typeof z_U__source_fake_data_options>
export type U__source_fake_data = z.infer<typeof z_U__source_fake_data>
```

`fields` is optional. When omitted, the entity is created as an empty table (dynamic document — fields are defined on insert). When present, each value is a raw faker expression string (e.g. `person.firstName`, `"number.int({ min: 10, max: 100 })"`).

## 5. Faker Expression Format

Each field value is a `@faker-js/faker` expression string. The provider resolves it as follows:

1. If the expression ends with `)` — it is a **call expression**. Use as-is.
2. If the expression does not end with `)` — it is a **method reference**. Append `()`.
3. Prepend `faker.` to the resolved expression.
4. Evaluate the result via the Sandbox (`vm2`) with the `faker` instance in context.

### Resolution examples

| YAML value | Resolved expression |
|---|---|
| `string.uuid` | `faker.string.uuid()` |
| `person.firstName` | `faker.person.firstName()` |
| `datatype.boolean` | `faker.datatype.boolean()` |
| `date.anytime` | `faker.date.anytime()` |
| `number.int({ min: 10, max: 100 })` | `faker.number.int({ min: 10, max: 100 })` |
| `person.firstName('male')` | `faker.person.firstName('male')` |
| `commerce.price({ min: 1, max: 500 })` | `faker.commerce.price({ min: 1, max: 500 })` |

### Sandbox evaluation

Faker expressions are compiled once per field via the Sandbox (`vm2`), then called per row. The `faker` instance is injected into the sandbox context.

```ts
import { Sandbox } from "../sandbox/Sandbox"

// Pre-compile: one sandbox evaluation per field (not per row)
const generators = Object.entries(fields).map(([fieldName, expression]) => ({
	fieldName,
	fn: sandbox.Evaluate<() => unknown>(
		expression.endsWith(")")
			? `() => faker.${expression}`
			: `() => faker.${expression}()`
	)!,
}))

// Generate: one function call per field per row — no sandbox overhead
for (let i = 0; i < count; i++) {
	const row: Record<string, unknown> = {}
	for (const { fieldName, fn } of generators) {
		row[fieldName] = fn()
	}
	rows.push(row)
}
```

For 100 rows × 10 fields: 10 sandbox compilations + 1 000 plain function calls, instead of 1 000 sandbox evaluations.

The Sandbox applies:
- `maliciousPatterns` validation (blocks `require`, `eval`, `process`, SQL injection, etc.)
- 5-second timeout per evaluation
- vm2 isolation (no access to Node.js APIs)

## 6. Configuration Reference

### Source properties

| Property | Type | Required | Description |
|---|---|---:|---|
| `provider` | `string` | Yes | Must be `fake-data`. |
| `options` | `object` | Yes | FakeData configuration. |

### Options

| Property | Type | Required | Default | Description |
|---|---|---:|---:|---|
| `seed` | `integer` | No | Random | Seed for `@faker-js/faker`. Ensures reproducible generation. |
| `autocreate` | `boolean` | No | `true` | When `true`, selecting an entity not defined in `entities` creates an empty table (inherited from `MemoryData`). |
| `entities` | `object` | Yes | — | Entity definitions exposed by the source. |

### Entity properties

| Property | Type | Required | Default | Description |
|---|---|---:|---:|---|
| `rows` | `integer` | No | `100` | Number of records generated. Must be ≥ 0. |
| `locale` | `string` | No | `en` | Faker locale for this entity. |
| `fields` | `object` | No | — | Field definitions. Keys are field names, values are faker expressions. When omitted, entity is an empty dynamic document. |

## 7. Field Configuration

Each field is defined as a key-value pair where the key is the field name and the value is a faker expression string:

```yaml
fields:
  id: string.uuid
  name: person.fullName
  age: "number.int({ min: 18, max: 80 })"
```

Fields that contain special characters (spaces, colons, curly braces) or start with digits must be quoted in YAML:

```yaml
fields:
  1st_name: person.firstName     # quoted key
  "order-id": string.uuid        # quoted key
  age: "number.int({ min: 18 })" # quoted value (contains braces)
```

## 8. Supported Faker Namespaces

The initial version supports these `@faker-js/faker` namespaces:

```text
person.*       — name, firstName, lastName, fullName, jobTitle, ...
internet.*     — email, url, username, password, ...
company.*      — name, catchPhrase, bs, ...
commerce.*     — productName, price, department, ...
location.*     — city, country, streetAddress, ...
datatype.*     — boolean, uuid, ...
string.*       — uuid, alpha, numeric, ...
number.*       — int, float, ...
date.*         — anytime, past, future, ...
phone.*        — number, ...
lorem.*        — word, sentence, paragraph, ...
```

Unknown namespaces or methods must produce a validation error at config load time, not at generation time.

## 9. Safe Generated Values

Generated values should avoid accidental contact with real systems or people where practical.

Examples:

- Emails should use `example.test` or another reserved test domain.
- URLs should use `example.test`.
- Generated identifiers should not resemble production identifiers unless explicitly configured.
- No production source should be queried by the FakeData provider.

## 10. Deterministic Generation

When `seed` is configured at source level, the same source configuration, entity definitions, row counts, and `@faker-js/faker` version produce reproducible data.

```yaml
options:
  seed: 42
  entities:
    customers:
      rows: 10
      fields:
        name: person.firstName
```

The `Faker` instance is created once per provider with the configured seed. All entities in the same source share the same Faker instance and seed.

When no seed is specified, the provider generates a random seed.

The `@faker-js/faker` version should be pinned for CI because generated output can change between library versions.

## 11. CRUD Behavior

Since `FakeData` extends `MemoryData`, all CRUD operations are fully implemented via the parent class:

| Operation | Behavior |
|---|---|
| `Select` | Reads from in-memory DataBase. Supports `fields`, `filter`, `sort`, `limit`, `offset`, `cache`. |
| `Insert` | Adds rows to the in-memory DataBase table. Clears cache. |
| `Update` | Updates rows via SQL on the in-memory DataBase. Clears cache. |
| `Delete` | Deletes rows via SQL on the in-memory DataBase. Clears cache. |
| `ListEntities` | Lists all tables in the in-memory DataBase with row counts. |
| `AddEntity` | Throws `HttpErrorNotImplemented()` — entities are defined in source config. |

Write operations work because the fake data is stored in a real in-memory DuckDB DataBase.

## 12. Row Generation

Rows are generated per entity during `Connect`:

```text
rows = 0  → empty entity
rows = 1  → one generated record
rows = 100 → one hundred generated records
```

Generated rows are materialized into `DataTable` instances and stored in the provider's in-memory `DataBase` via `Connection.Tables[entity].RowsSet(rows)`.

When `fields` is defined, each row contains all configured fields. When `fields` is omitted, the entity is created as an empty table — a dynamic document with no predefined columns. Fields can be added later via `Insert`.

## 13. Schema and Source Switching

A test schema should point to the FakeData source instead of the production source.

```yaml
sources:
  crm-postgres:
    provider: postgres
    host: db.example.com
    database: crm

  fake-crm:
    provider: fake-data
    options:
      seed: 42
      entities:
        customers:
          rows: 100
          fields:
            id: string.uuid
            email: internet.email
```

Production schema:

```yaml
schemas:
  crm:
    sources:
      - crm-postgres
```

Test schema:

```yaml
schemas:
  crm-test:
    sources:
      - fake-crm
```

```text
Production: Plan / MCP Tool → crm → crm-postgres
Test:       Plan / MCP Tool → crm-test → fake-crm
```

## 14. Source Mimicry

FakeData should mimic the logical shape of a real source, not the behavior of its database engine.

A fake source is considered compatible when it exposes:

- The expected entity names.
- The expected field names.
- Compatible logical types.
- Sufficiently representative values.

Foreign keys, joins, relational dependency graphs, and database-specific behavior are out of scope.

## 15. MCP Usage

MCP Tools operate through Metal schemas and do not need FakeData-specific behavior.

```text
MCP Client → MCP Tool → Test Schema → FakeData Source → Generated Entity Records
```

FakeData must not silently fall back to a production provider if its configuration is invalid or missing.

## 16. Validation Rules

The provider validates configuration at load time using Zod schemas.

Required validation includes:

- `provider` equals `fake-data` (enforced by zod discriminated union).
- `options` exists and passes `z_U__source_fake_data_options` schema.
- `entities` exists and is a non-empty object.
- Each entity has a `fields` object (optional — entity may be empty).
- Each field value, when present, is a non-empty string.
- `rows` is an integer ≥ 0.
- Faker expressions reference known namespaces/methods (validated against the allowlist).
- `seed` is an accepted integer value.

Unknown faker namespaces or methods must fail validation at config load time.

## 17. Non-Goals

The initial implementation does not include:

- Primary-key enforcement.
- Foreign-key generation.
- Relational dependency resolution.
- Joins implemented by the provider.
- Persistence between executions.
- Production data copying.
- Database-specific SQL behavior.
- Complete emulation of PostgreSQL, MongoDB, MySQL, or other providers.
- Arbitrary JavaScript code execution outside the faker sandbox.

## 18. Example Configurations

### Minimal — single entity

```yaml
sources:
  fake-basic:
    provider: fake-data
    options:
      entities:
        users:
          fields:
            name: person.fullName
            email: internet.email
```

Generates 100 rows (default) with random seed, `en` locale (default).

### With constraints

```yaml
sources:
  fake-crm:
    provider: fake-data
    options:
      seed: 2026
      entities:
        customers:
          locale: en
          rows: 50
          fields:
            id: string.uuid
            firstName: person.firstName
            lastName: person.lastName
            email: internet.email
            company: company.name
            age: "number.int({ min: 18, max: 80 })"
            active: datatype.boolean
            createdAt: date.anytime
```

### Multiple entities with different locales

```yaml
sources:
  fake-ecommerce:
    provider: fake-data
    options:
      seed: 99
      entities:
        products:
          locale: en
          rows: 200
          fields:
            id: string.uuid
            name: commerce.productName
            price: "commerce.price({ min: 1, max: 999 })"
            inStock: datatype.boolean
        orders:
          locale: en
          rows: 100
          fields:
            id: string.uuid
            productId: string.uuid
            quantity: "number.int({ min: 1, max: 10 })"
            total: "number.float({ min: 1, max: 5000, fractionDigits: 2 })"
            placedAt: date.anytime
        reviews:
          locale: fr
          rows: 50
          fields:
            id: string.uuid
            author: person.fullName
            rating: "number.int({ min: 1, max: 5 })"
            comment: lorem.paragraph
```

### Nullable fields

```yaml
sources:
  fake-nullable:
    provider: fake-data
    options:
      entities:
        contacts:
          rows: 10
          fields:
            name: person.fullName
            phone: phone.number
            notes: lorem.sentence
```

### Full end-to-end with schema and plan

```yaml
sources:
  fake-crm:
    provider: fake-data
    options:
      seed: 2026
      entities:
        customers:
          locale: en
          rows: 50
          fields:
            id: string.uuid
            firstName: person.firstName
            lastName: person.lastName
            email: internet.email
            company: company.name
            age: "number.int({ min: 18, max: 80 })"
            active: datatype.boolean
            createdAt: date.anytime

schemas:
  crm-test:
    sources:
      - fake-crm

plans:
  normalize-customers:
    steps:
      - select:
          schema: crm-test
          entity: customers
          fields: "*"
      # Existing Metal transformation and sink steps follow.
```

## 19. Acceptance Criteria

The provider is ready for an initial release when:

- A source with `provider: fake-data` can be loaded from YAML.
- The source exposes configured entities.
- Entity schemas expose configured fields.
- Records are generated from faker expressions.
- `rows: 0` returns an empty entity.
- A fixed seed produces reproducible records.
- Invalid configurations fail before data generation.
- Unknown faker expressions fail at config load time.
- Read operations work through the normal Metal schema API.
- Write operations (`Insert`, `Update`, `Delete`) work through the in-memory DataBase.
- `AddEntity` throws `HttpErrorNotImplemented`.
- ETL Plans can read from the provider.
- MCP Tools can read from the provider through a Metal schema.
- The provider cannot access production sources.

## 20. Implementation Files

| File | Purpose |
|---|---|
| `apps/server/src/modules/source/@consts.ts` | Add `FAKE_DATA = "fake-data"` to `DATA_PROVIDER` |
| `apps/server/src/modules/source/types/U__source_fake_data.ts` | Zod schema for source config |
| `apps/server/src/modules/source/providers/FakeData.ts` | Provider class extending `MemoryData` |
| `apps/server/src/modules/core/types/U__sources.ts` | Add `z_U__source_fake_data` to `z_U__sources_source` discriminated union |
| `apps/server/src/modules/source/DataProvider.ts` | Add entry to `#providerMap` |
| `apps/server/src/modules/source/__tests__/FakeData.test.ts` | Provider tests |
| `apps/server/package.json` | Add `@faker-js/faker` dependency |

## 21. Summary

`FakeData` is a `MemoryData` subclass pre-populated with synthetic data:

```text
YAML source configuration
  → FakeData.Connect() evaluates faker expressions via Sandbox
  → Rows stored in MemoryData's in-memory DataBase
  → Metal schema
  → ETL Plan or MCP Tool
```

All CRUD operations are inherited from `MemoryData`. Its purpose is to provide realistic, safe, reproducible records for testing Metal operations.
