# Metal MCP Server

Exposes Metal's data sources, schemas, entities, and plans as MCP (Model Context Protocol) tools. Read-only — no mutating operations.

## Configuration

Add to `config.yml`:

```yaml
mcp:
  enabled: true
  route: /mcp                    # optional, defaults to /mcp
  hide-sensitive-data:           # optional, fields to strip from results
    - password
    - secret
```

The MCP endpoint uses Metal's existing auth middleware — all requests must include a valid `Authorization: Bearer <token>` header.

## Tools

### `list_sources`

List all configured data sources.

**Input:** None

**Example call:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "list_sources",
    "arguments": {}
  }
}
```

**Response:**
```json
[
  { "name": "my-postgres", "provider": "POSTGRES", "host": "localhost", "port": 5432, "database": "mydb" },
  { "name": "my-mssql", "provider": "MSSQL", "host": "10.0.0.1", "port": 1433, "database": "production" }
]
```

---

### `get_source`

Get details of a specific data source (password is stripped).

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sourceId` | string | yes | The source name/id |

**Example call:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "get_source",
    "arguments": { "sourceId": "my-postgres" }
  }
}
```

**Response:**
```json
{
  "name": "my-postgres",
  "provider": "POSTGRES",
  "host": "localhost",
  "port": 5432,
  "database": "mydb"
}
```

---

### `list_schemas`

List all configured schemas with their entities and source mappings.

**Input:** None

**Example call:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "list_schemas",
    "arguments": {}
  }
}
```

**Response:**
```json
[
  {
    "name": "my-schema",
    "source": "my-postgres",
    "entities": {
      "users": { "source": "my-postgres", "entity": "public.users" }
    }
  }
]
```

---

### `get_schema`

Get details of a specific schema including its entities, source mappings, roles, and anonymization config.

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaId` | string | yes | The schema name |

**Example call:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "get_schema",
    "arguments": { "schemaId": "my-schema" }
  }
}
```

**Response:**
```json
{
  "name": "my-schema",
  "source": "my-postgres",
  "entities": {
    "users": { "source": "my-postgres", "entity": "public.users" },
    "orders": { "source": "my-postgres", "entity": "public.orders" }
  },
  "roles": ["admin", "reader"],
  "anonymize": "email, phone"
}
```

---

### `preview_entity`

Preview a small sample of rows from an entity. If only `entity` is provided, it is searched across all schemas. System fields (`__seq__`, `__idx__`, `__data__`, `__deleted__`, `__created_at__`) are always stripped.

**Input:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `entity` | string | yes | — | The entity name to preview |
| `schema` | string | no | — | The schema name (if omitted, entity is searched globally) |
| `limit` | number | no | 5 | Max rows to return (capped at 20) |

**Example call:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "preview_entity",
    "arguments": { "entity": "users", "schema": "my-schema", "limit": 3 }
  }
}
```

**Response:**
```json
{
  "schema": "my-schema",
  "entity": "users",
  "fields": { "id": "BIGINT", "name": "VARCHAR", "email": "VARCHAR" },
  "rows": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" },
    { "id": 2, "name": "Bob", "email": "bob@example.com" },
    { "id": 3, "name": "Charlie", "email": "charlie@example.com" }
  ],
  "count": 3
}
```

---

### `list_plans`

List all configured plans with their step counts.

**Input:** None

**Example call:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "list_plans",
    "arguments": {}
  }
}
```

**Response:**
```json
[
  { "name": "etl-daily", "steps": 4 },
  { "name": "sync-inventory", "steps": 2 }
]
```

---

### `get_plan`

Get the full definition of a plan including its steps, error handling, and failure strategy.

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `planId` | string | yes | The plan name |

**Example call:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "get_plan",
    "arguments": { "planId": "etl-daily" }
  }
}
```

**Response:**
```json
{
  "name": "etl-daily",
  "steps": [
    { "select": { "schema": "source", "entity": "raw_data" } },
    { "transform": { "field": "date", "as": "parsed_date", "expression": "new Date($row.date)" } },
    { "insert": { "schema": "warehouse", "entity": "daily_report" } }
  ],
  "on-error": { "strategy": "throw", "scope": "step" },
  "failure-strategy": "throw"
}
```

---

## Testing with MCP Inspector

```sh
npx @modelcontextprotocol/inspector
```

Point it at `http://localhost:3000/mcp` with a valid Bearer token in the auth header.

## Architecture

- `adapter.ts` — `MetalMcpAdapter` creates a fresh `McpServer` per request (stateless mode), registers all tools, and connects via `StreamableHTTPServerTransport`.
- `_hook.ts` — Auto-discovered by `ServerCore.LoadModuleHooks()`. Registers the `/mcp` route if `mcp.enabled: true` in config.
- `router.ts` — Express router: POST → MCP handler, GET/DELETE → 405.
- User context is propagated via `AsyncLocalStorage` so tool implementations can access the authenticated user for role checking.
- Each tool call is logged with tool name, input args, caller identity, timestamp, and success/error status.
