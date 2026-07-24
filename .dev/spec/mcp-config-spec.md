# MCP Server Configuration — Specification (Draft v0.1)

> Status: Proposal / RFC
> Target: Metal `config.yml`, new top-level `mcp` section
> Depends on: `sources`, `schemas`, `plans`, `roles`, `users` (existing sections)

## 1. Overview

This feature adds a declarative way to expose Metal `schemas`, `entities`, and `plans` as **MCP (Model Context Protocol) tools**, so that any LLM client supporting MCP (Claude Desktop, Claude Code, or any other MCP host) can call them directly.

Metal already abstracts connectivity to databases (PostgreSQL, MSSQL, MySQL, MongoDB, CosmosDB), files (local, FTP, SMB, S3, Azure storage), and web services (REST, SOAP) behind a single `sources` → `schemas` → `entities` model, with `plans` providing multi-step, multi-source ETL logic. This section reuses that model instead of introducing a new one: an MCP tool is a named, described, parameterized entry point into an existing schema entity or plan.

**Design goals**

- **No new execution engine.** Every MCP tool call resolves to an existing Metal operation (`select` against a schema/entity, or a plan run).
- **Config-only.** No code required to add, remove, or change a tool.
- **Safe by default.** Tools are read-only unless explicitly marked otherwise, and inherit Metal's existing `roles`/`users` permission model.
- **Sidecar posture.** The MCP server is a mode of an existing Metal server instance, not a separate product — consistent with Metal's "middleware, not platform" positioning.

## 2. Enabling the MCP endpoint

The MCP endpoint is enabled through Metal's existing `server.endpoints` configuration, alongside other server-level endpoint toggles, rather than through the `mcp` section itself:

```yaml
server:
  port: 3000
  endpoints:
    enable-mcp: true
```

| Parameter                     | Type    | Required | Description                                      |
| ----------------------------- | ------- | -------- | ------------------------------------------------ |
| `server.endpoints.enable-mcp` | Boolean | N        | Turns the MCP endpoint on/off (default: `false`) |

`mcp.tools` declarations (see [§4](#4-tools)) are still validated at startup regardless of `enable-mcp`, but the endpoint itself only becomes reachable when it's set to `true`. This mirrors how other optional Metal endpoints are toggled under `server.endpoints`, keeping all "is this surface exposed" decisions in one place.

## 3. Top-level `mcp` section

With the endpoint enabled via `server.endpoints.enable-mcp`, the `mcp` section itself is used only to describe the server's MCP identity and declare its tools:

```yaml
mcp:
  server:
    name: my-metal-mcp
    version: "1.0.0"
  tools:
    get_users:
      description: "Get list of users, optionally filtered by status"
      schema: crm
      entity: users
      parameters:
        status:
          type: string
          required: false
          description: "Filter users by status (active, inactive)"
```

| Parameter | Type   | Required | Description                                                                                                                                 |
| --------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `server`  | Object | N        | MCP protocol metadata (name/version) reported to clients during initialization. Not to be confused with Metal's top-level `server` section. |
| `tools`   | Object | Y        | Declared MCP tools (see [§4](#4-tools))                                                                                                     |

## 4. Transport

Metal exposes MCP exclusively over **HTTP**, on the same server instance as the existing REST API — there is no separate `transport` configuration. The MCP endpoint reuses `server.port` (and the same TLS/network setup) rather than opening a second port, so there is nothing new to declare here beyond `server.endpoints.enable-mcp`.

The MCP endpoint path is fixed at `/mcp` (not user-configurable in v1, to keep the config surface small and avoid collisions with the `schemas`/`plans` REST routes).

This also means `stdio`-based launch (Metal as a subprocess of a local agent host) is **not** supported in v1 — clients connect to a running Metal server over HTTP, the same way they'd hit its REST API today.

## 4. `tools`

Each key under `tools` is the MCP tool name exposed to the LLM client (must match `^[a-zA-Z0-9_-]+$`, matching MCP naming conventions). A tool is backed by **either** a schema entity **or** a plan — not both.

### 4.1 Common parameters

| Parameter     | Type    | Required | Description                                                                                                            |
| ------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `description` | String  | Y        | Natural-language description shown to the LLM. Required — this is what the model uses to decide when to call the tool. |
| `schema`      | String  | C*       | Name of a declared schema (see `schemas`)                                                                              |
| `entity`      | String  | C*       | Name of an entity within `schema`                                                                                      |
| `plan`        | String  | C*       | Name of a declared plan (see `plans`), as an alternative to `schema`/`entity`                                          |
| `action`      | Enum    | N        | `read`, `create`, `update`, `delete` (default: `read`)                                                                 |
| `destructive` | Boolean | N        | Must be explicitly `true` for any `action` other than `read` (default: `false`)                                        |
| `role`        | String  | N        | Minimum role required to see/call this tool (see `roles`). Defaults to server's `default-role`, if set.                |
| `cache`       | Integer | N        | Seconds to cache results (only for `action: read`), same semantics as `select.cache`                                   |
| `parameters`  | Object  | N        | Declared input parameters for the tool (see [§4.2](#42-parameters))                                                    |

*C: exactly one of `schema`+`entity` or `plan` must be set.

### 4.2 `parameters`

Each key under `parameters` becomes a field in the MCP tool's JSON input schema, and is made available to the underlying `select`/`plan` step as a bind variable, in the same way `$schema`/`$entity` are available in the Dynamic Expression Engine today.

| Parameter     | Type    | Required | Description                                                                             |
| ------------- | ------- | -------- | --------------------------------------------------------------------------------------- |
| `type`        | Enum    | Y        | `string`, `number`, `boolean`, `array`                                                  |
| `required`    | Boolean | N        | Whether the LLM must supply this parameter (default: `false`)                           |
| `description` | String  | Y        | Description shown to the LLM for this parameter                                         |
| `default`     | Any     | N        | Default value used when the parameter is omitted                                        |
| `enum`        | Array   | N        | Restricts allowed values                                                                |
| `maps-to`     | String  | N        | Underlying field to bind to, if different from the parameter's key (default: same name) |

**Example — schema/entity-backed read tool**

```yaml
mcp:
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

This is functionally equivalent to a `select` plan step with `filter: { status: $params.status }` and a `fields`/pagination constraint — Metal builds that step internally, the author never writes it.

**Example — plan-backed tool (multi-source)**

```yaml
plans:
  reconcile-orders:
    orders:
      - select:
          schema: sales-db
          entity: orders
          filter-expression: "order_id = ${{ $params.order_id }}"
      - join:
          type: left
          schema: shipping-api
          entity: shipments
          left-field: order_id
          right-field: order_id

mcp:
  tools:
    reconcile_orders:
      description: "Cross-reference an order in the database with its shipping status"
      plan: reconcile-orders
      parameters:
        order_id:
          type: string
          required: true
          description: "Order ID to look up"
```

**Example — destructive tool (explicit opt-in)**

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

Without `destructive: true`, Metal refuses to start any tool declared with `action` other than `read` — this is a hard validation error, not a warning, to prevent accidental exposure of write/delete access to an agent.

## 5. Authorization model

MCP tool access reuses Metal's existing `roles`/`users`/`server.authentication` configuration rather than introducing a parallel permission system.

- If `server.authentication` is not configured, all declared tools are exposed unauthenticated over HTTP. Metal SHOULD emit a startup warning in this state, since unauthenticated MCP tool access is only appropriate on a trusted/local network.
- If authentication is configured, each tool's effective required permission is derived from its `action`:

  | `action` | Required role permission |
  | -------- | ------------------------ |
  | `read`   | `r`                      |
  | `create` | `c`                      |
  | `update` | `u`                      |
  | `delete` | `d`                      |

- An explicit `role:` on a tool overrides the derived permission and pins the tool to that named role regardless of the caller's own role, letting an operator restrict a specific tool further than the general permission model would.
- Tools the caller's role doesn't satisfy are omitted from `tools/list` entirely (not just rejected on call), so the LLM never sees or attempts to use tools it has no access to.

## 6. Validation rules (startup-time)

Metal MUST fail to start (not silently ignore) when:

1. A tool declares both `schema`/`entity` and `plan`, or neither.
2. A tool's `schema` or `plan` reference does not exist in the config.
3. A tool declares `action` other than `read` without `destructive: true`.
4. Two tools share the same name.
5. A `parameters` entry is missing `description` (required for LLM usability) or `type`.
6. `mcp.enabled` is `true` and no authentication is configured — this MUST emit a startup warning (not a hard failure), since local dev/trusted-network use is a valid use case.

## 7. Open questions

- **Pagination default**: should `read` tools without an explicit `limit` parameter get an implicit server-side cap (e.g. 100 rows) to protect against unbounded result sets returned to the LLM context?
- **Tool versioning**: if a tool's `parameters` shape changes, should Metal expose that as a breaking change requiring a version bump in `mcp.server.version`, or is config-file versioning (`version:` at the top of `config.yml`) sufficient?
- **Streaming results**: MCP supports incremental/streamed tool results — is this worth supporting for large `read` tools, or out of scope for v1?
- **Multi-tenancy**: should `mcp.tools` support per-tenant scoping (e.g. binding a tool to a specific `source` based on the authenticated user), or is that a v2 concern?

## 8. Non-goals (v1)

- Write access beyond simple `create`/`update`/`delete` on a single entity (no multi-step transactional plans exposed as a single "write" tool in v1 — read-only plans only, per §4.1).
- Tool discovery across multiple Metal instances (federation) — each Metal instance exposes its own MCP server independently.
- A UI for managing `mcp.tools` — config-file only in v1, consistent with the rest of Metal's configuration model.
