# Metal MCP Server

Exposes Metal schemas and entities as MCP (Model Context Protocol) tools via declarative YAML configuration. Any LLM client supporting MCP (Claude Desktop, Claude Code, etc.) can call them directly.

## Configuration

### Enable the endpoint

```yaml
server:
  port: 3000
  endpoints:
    enable-mcp: true
```

### Declare tools

```yaml
mcp:
  hide-sensitive-data:
    - password
    - secret
  tools:
    get_users:
      description: "Get list of users, optionally filtered by status"
      schema: crm
      entity: users
      action: read
      cache: 30
      limit: 50
      fields: [id, name, email]
      arguments:
        status:
          type: string
          required: false
          description: "Filter by status"
          map-to: user_status
          enum: [active, inactive]
```

## Tool Declaration

Each key under `mcp.tools` is the MCP tool name. Every tool maps to a schema entity and an action (`read`, `create`, `update`, `delete`, `list`).

### Parameters

| Parameter     | Type    | Required | Description                                                                 |
| ------------- | ------- | -------- | --------------------------------------------------------------------------- |
| `description` | String  | Y        | Description shown to the LLM                                               |
| `schema`      | String  | Y        | Schema name (must exist in `schemas` config)                               |
| `entity`      | String  | Y        | Entity name within the schema                                               |
| `action`      | Enum    | N        | `read`, `create`, `update`, `delete`, `list` (default: `read`)             |
| `roles`       | Array   | N        | Required roles (any match). If omitted, access is permission-based          |
| `cache`       | Integer | N        | Seconds to cache results (read only)                                       |
| `limit`       | Integer | N        | Max rows to return (default: 20)                                           |
| `fields`      | Array   | N        | Restrict returned columns (read only). Omit to return all fields           |
| `arguments`   | Object  | N        | Input arguments (see below)                                                |

### Input Arguments

| Parameter     | Type    | Required | Description                                     |
| ------------- | ------- | -------- | ----------------------------------------------- |
| `type`        | Enum    | Y        | `string`, `number`, `boolean`, `array`          |
| `description` | String  | Y        | Description shown to the LLM                    |
| `map-to`      | String  | Y        | Target field name in the schema entity          |
| `required`    | Boolean | N        | Whether the LLM must supply this (default: `false`) |
| `default`     | Any     | N        | Default value when omitted                      |
| `enum`        | Array   | N        | Restricts allowed values                        |

## Examples

### Read tool with filtering

```yaml
mcp:
  tools:
    get_users:
      description: "Get users filtered by status"
      schema: crm
      entity: users
      action: read
      limit: 50
      fields: [id, name, email]
      arguments:
        status:
          type: string
          required: false
          description: "Filter by status"
          map-to: user_status
          enum: [active, inactive]
```

### Create tool

```yaml
mcp:
  tools:
    create_user:
      description: "Create a new user"
      schema: crm
      entity: users
      action: create
      roles: [admin]
      arguments:
        name:
          type: string
          required: true
          description: "User's full name"
          map-to: full_name
        email:
          type: string
          required: true
          description: "User's email address"
          map-to: email
```

### List tool

```yaml
mcp:
  tools:
    list_folders:
      description: "Get list of folders"
      schema: fs
      action: list
      limit: 10
```

Lists entities within a schema. The `entity` field is ignored — the schema defines which entities are available.

### Delete tool

```yaml
mcp:
  tools:
    delete_stale_sessions:
      description: "Delete sessions older than N days"
      schema: auth
      entity: sessions
      action: delete
      roles: [admin]
      arguments:
        days:
          type: number
          required: true
          description: "Delete sessions older than this many days"
          map-to: created_days_ago
```

### Plan-backed data via schema

Plans can be exposed as schema entities through a `plans` provider:

```yaml
sources:
  src-myplan:
    provider: plans

schemas:
  myplan:
    source: src-myplan

mcp:
  tools:
    run_report:
      description: "Run the daily report plan"
      schema: myplan
      entity: daily-report
      action: read
```

## Authorization

MCP tool access reuses Metal's existing `roles`/`users`/`server.authentication` configuration:

- If no authentication is configured, all tools are exposed unauthenticated (startup warning emitted)
- Each tool's required permission is derived from its `action` (`read`→`r`, `create`→`c`, `update`→`u`, `delete`→`d`)
- An explicit `roles:` array on a tool overrides the derived permission — user must have at least one of the listed roles
- If `roles` is omitted, access is permission-based (derived from `action`)
- Tools the caller can't access are omitted from `tools/list` entirely

## Validation (startup)

Metal fails to start when:
1. Tool name doesn't match `^[a-zA-Z0-9_-]+$`
2. `schema` reference doesn't exist in config
3. `entity` doesn't exist within the schema (unless schema has wildcard source)
4. A parameter is missing `description` or `type`

## Architecture

- `adapter.ts` — Creates a fresh `McpServer` per request (stateless), registers config-driven tools with arguments as input schema
- `_hook.ts` — Runs validator, checks `server.endpoints.enable-mcp`, registers route
- `router.ts` — Express router: POST → MCP handler
- `McpToolsValidator.ts` — Startup validation for tool declarations
- User context propagated via `AsyncLocalStorage`
