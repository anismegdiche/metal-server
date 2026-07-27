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
  server:
    name: my-metal-mcp
    version: "1.0.0"
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
      parameters:
        status:
          type: string
          required: false
          description: "Filter by status"
          enum: [active, inactive]
        limit:
          type: number
          required: false
          description: "Max rows to return"
          default: 50
```

## Tool Declaration

Each key under `mcp.tools` is the MCP tool name. Every tool maps to a schema entity and an action.

### Parameters

| Parameter     | Type    | Required | Description                                                                 |
| ------------- | ------- | -------- | --------------------------------------------------------------------------- |
| `description` | String  | Y        | Description shown to the LLM                                               |
| `schema`      | String  | Y        | Schema name (must exist in `schemas` config)                               |
| `entity`      | String  | Y        | Entity name within the schema                                               |
| `action`      | Enum    | N        | `read`, `create`, `update`, `delete` (default: `read`)                     |
| `destructive` | Boolean | N        | Must be `true` for any `action` other than `read`                          |
| `role`        | String  | N        | Minimum role required to call this tool                                    |
| `cache`       | Integer | N        | Seconds to cache results (read only)                                       |
| `parameters`  | Object  | N        | Input parameters (see below)                                               |

### Input Parameters

| Parameter     | Type    | Required | Description                                     |
| ------------- | ------- | -------- | ----------------------------------------------- |
| `type`        | Enum    | Y        | `string`, `number`, `boolean`, `array`          |
| `required`    | Boolean | N        | Whether the LLM must supply this (default: `false`) |
| `description` | String  | Y        | Description shown to the LLM                    |
| `default`     | Any     | N        | Default value when omitted                      |
| `enum`        | Array   | N        | Restricts allowed values                        |
| `maps-to`     | String  | N        | Underlying field name if different from key     |

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
      parameters:
        status:
          type: string
          required: false
          description: "Filter by status"
          enum: [active, inactive]
        limit:
          type: number
          required: false
          description: "Max rows"
          default: 50
```

### Create tool (destructive)

```yaml
mcp:
  tools:
    create_user:
      description: "Create a new user"
      schema: crm
      entity: users
      action: create
      destructive: true
      role: admin
      parameters:
        name:
          type: string
          required: true
          description: "User's full name"
        email:
          type: string
          required: true
          description: "User's email address"
```

### Delete tool (destructive)

```yaml
mcp:
  tools:
    delete_stale_sessions:
      description: "Delete sessions older than N days"
      schema: auth
      entity: sessions
      action: delete
      destructive: true
      role: admin
      parameters:
        days:
          type: number
          required: true
          description: "Delete sessions older than this many days"
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
- An explicit `role:` on a tool overrides the derived permission
- Tools the caller can't access are omitted from `tools/list` entirely

## Validation (startup)

Metal fails to start when:
1. Tool name doesn't match `^[a-zA-Z0-9_-]+$`
2. `schema` reference doesn't exist in config
3. `entity` doesn't exist within the schema (unless schema has wildcard source)
4. `action` is not `read` without `destructive: true`
5. A parameter is missing `description` or `type`

## Architecture

- `adapter.ts` — Creates a fresh `McpServer` per request (stateless), registers config-driven tools
- `_hook.ts` — Runs validator, checks `server.endpoints.enable-mcp`, registers route
- `router.ts` — Express router: POST → MCP handler
- `McpToolsValidator.ts` — Startup validation for tool declarations
- User context propagated via `AsyncLocalStorage`
