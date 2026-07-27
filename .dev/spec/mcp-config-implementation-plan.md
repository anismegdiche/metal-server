# MCP Configurable Tools — Implementation Plan

> Spec: `.dev/spec/mcp-config-spec.md`
> Goal: Replace the current hardcoded MCP tools with a declarative, config-driven tool system. Any schema entity or plan becomes an MCP tool with zero code — just YAML.

---

## Decisions

| Question | Answer |
|----------|--------|
| Endpoint toggle | Migrate from `mcp.enabled` → `server.endpoints.enable-mcp` (remove `mcp.enabled`) |
| Existing hardcoded tools | Remove all 7 (list_sources, get_source, list_schemas, get_schema, preview_entity, list_plans, get_plan) — only declarative tools from config |

---

## Phase 1: Config Schema Changes

### 1.1 Add `server.endpoints` to `U__server`

**File:** `apps/server/src/modules/core/types/U__server.ts`

Add an `endpoints` object to `z_U__server`:

```ts
export const z_U__server_endpoints = z.object({
    "enable-mcp": z.boolean().default(false).optional(),
})

export const z_U__server = z.object({
    // ... existing fields ...
    endpoints: z_U__server_endpoints.optional(),
})
```

### 1.2 Rewrite `U__mcp` with tool declarations

**File:** `apps/server/src/modules/mcp/types/U__mcp.ts`

Replace the current schema with:

```ts
// MCP parameter types
export const z_U__mcp_tool_parameter_type = z.enum(["string", "number", "boolean", "array"])

export const z_U__mcp_tool_parameter = z.object({
    type: z_U__mcp_tool_parameter_type,
    required: z.boolean().default(false).optional(),
    description: z.string().min(1),
    default: z.unknown().optional(),
    enum: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
    "maps-to": z.string().optional(),
})

// MCP tool action
export const z_U__mcp_tool_action = z.enum(["read", "create", "update", "delete"])

// MCP tool definition (schema+entity OR plan, never both)
export const z_U__mcp_tool = z.intersection(
    z.strictObject({
        description: z.string().min(1),
        action: z_U__mcp_tool_action.default("read"),
        destructive: z.boolean().default(false),
        role: z.string().optional(),
        cache: z.number().int().min(1).optional(),
        parameters: z.record(z.string(), z_U__mcp_tool_parameter).default({}).optional(),
    }),
    z.union([
        z.object({ schema: z.string(), entity: z.string() }),
        z.object({ plan: z.string() }),
    ]),
)

// MCP server identity
export const z_U__mcp_server = z.object({
    name: z.string().default("metal-mcp"),
    version: z.string().default("1.0.0"),
}).optional()

// Top-level MCP config
export const z_U__mcp = z.object({
    server: z_U__mcp_server,
    tools: z.record(z.string(), z_U__mcp_tool).default({}),
    "hide-sensitive-data": z.array(z.string()).optional(),
})
```

**Key:** Remove `enabled`, `route`. Endpoint toggle moves to `server.endpoints.enable-mcp`. Route is fixed at `/mcp`.

### 1.3 Remove `enabled` from `z_U__mcp`

The old `enabled` and `route` fields are deleted entirely.

---

## Phase 2: Constants & Types

### 2.1 Update `@consts.ts`

**File:** `apps/server/src/modules/mcp/@consts.ts`

- Remove `MCP_TOOL` enum (no more hardcoded tools)
- Keep `MCP_DEFAULT_ROW_LIMIT = 20`
- Add validation error message constants

### 2.2 Create `McpToolParams` type

A resolved parameter type after config parsing:

```ts
export type McpToolParams = {
    name: string
    description: string
    action: "read" | "create" | "update" | "delete"
    destructive: boolean
    role?: string
    cache?: number
    schema?: string
    entity?: string
    plan?: string
    parameters: Record<string, {
        type: string
        required: boolean
        description: string
        default?: unknown
        enum?: unknown[]
        mapsTo?: string
    }>
}
```

---

## Phase 3: Validation (`McpToolsValidator`)

### 3.1 New file: `apps/server/src/modules/mcp/McpToolsValidator.ts`

A static class that runs at startup (called from `_hook.ts`), validates all tools in config, and throws `ConfigFileError` on any violation.

**Validates per spec §6:**
1. Tool has either `schema`+`entity` or `plan` — not both, not neither (enforced by Zod union, but double-check)
2. `schema` reference exists in config schemas
3. `entity` exists within that schema (or schema has wildcard `*` entity)
4. `plan` reference exists in config plans
5. `action` other than `read` requires `destructive: true` → hard error
6. No duplicate tool names (enforced by Zod record, but also check against potential built-in names)
7. Every `parameters` entry has `description` and `type` (enforced by Zod, but validate at this level too)
8. Tool name matches `^[a-zA-Z0-9_-]+$`
9. If MCP endpoint is enabled and no auth is configured → **startup warning** (not error)

**Signature:**
```ts
export class McpToolsValidator {
    static Validate(): void  // throws ConfigFileError on failure, logs warnings
}
```

### 3.2 Startup warning for unauthenticated MCP

If `server.endpoints.enable-mcp` is `true` and `server.authentication` is not configured (or has no `provider`), log:
```
[MCP] Warning: MCP endpoint is enabled without authentication. Restrict to trusted networks.
```

---

## Phase 4: Adapter Rewrite

### 4.1 Rewrite `MetalMcpAdapter`

**File:** `apps/server/src/modules/mcp/adapter.ts`

Remove all 7 hardcoded tool registrations. The adapter now:

1. Reads `mcp.tools` from config
2. For each tool declaration, registers an MCP tool with the SDK
3. Each tool handler dynamically executes the appropriate Metal operation

**Core method: `#registerConfigTools(server, toolsConfig)`**

For each tool in config:
- Build MCP tool description from `description`
- Build JSON Schema input from `parameters` (each parameter → property with type/description/enum/default/required)
- Register handler that:
  1. Gets user from AsyncLocalStorage
  2. Checks authorization (see §4.2)
  3. Routes to schema operation or plan execution (see §4.3)
  4. Returns result as MCP content

### 4.2 Authorization check

For each tool call:
1. If tool has explicit `role:` → check user has that role (user's roles must include tool's role)
2. If no explicit `role:` → derive required permission from `action`:
   - `read` → `r`
   - `create` → `c`
   - `update` → `u`
   - `delete` → `d`
3. Use `Roles.HasPermission(userToken, toolRoles, permission)` to check
4. If denied → return `isError: true` with "Permission denied"

**Important:** The spec says tools the caller can't access are omitted from `tools/list`. Since we create a fresh McpServer per request, we can filter at registration time — only register tools the current user can access.

### 4.3 Schema-backed tool execution

**`read` action:**
```ts
const schemaRequest: TSchemaRequestSelect = {
    schema: toolConfig.schema,
    entity: toolConfig.entity,
    // Build filter from parameters
    filter: buildFilterFromParams(args, toolConfig.parameters),
    // Apply cache if configured
    cache: toolConfig.cache,
}
const result = await Schema.Select(schemaRequest, user)
// Strip sensitive fields, return rows
```

**`create` action:**
```ts
const schemaRequest: TSchemaRequestInsert = {
    schema: toolConfig.schema,
    entity: toolConfig.entity,
    data: buildDataFromParams(args, toolConfig.parameters),
}
const result = await Schema.Insert(schemaRequest, user)
```

**`update` action:**
```ts
const schemaRequest: TSchemaRequestUpdate = {
    schema: toolConfig.schema,
    entity: toolConfig.entity,
    filter: buildFilterFromParams(args, toolConfig.parameters, /* filter-only */ true),
    data: buildDataFromParams(args, toolConfig.parameters, /* data-only */ true),
}
const result = await Schema.Update(schemaRequest, user)
```

**`delete` action:**
```ts
const schemaRequest: TSchemaRequestDelete = {
    schema: toolConfig.schema,
    entity: toolConfig.entity,
    filter: buildFilterFromParams(args, toolConfig.parameters),
}
const result = await Schema.Delete(schemaRequest, user)
```

### 4.4 Plan-backed tool execution

Plan-backed tools are always `action: read` (enforced by spec §8 non-goals).

```ts
// 1. Set $params in the plan context
// 2. Execute the plan
const plan = Plans.get(toolConfig.plan)
const result = await plan.Process(/* callerSchema */ undefined)
// 3. Return result DataTable rows
```

The challenge: `Plan.Process()` uses `$context.$vars` for dynamic expressions. We need to inject tool parameters into `$vars` so plan steps can reference them via `${{ $params.param_name }}`.

**Solution:** The plan execution needs a way to pass initial vars. Looking at `Plan.Process()`, it creates `$context.$vars = {}`. We need to either:
- Call a method that accepts initial vars, OR
- Set `$vars` on the context after plan creation

Since `Plan.Process` is internal, the cleanest approach is to add an optional `vars` parameter to `Plan.Process()` or use `Plan.ProcessSchemaRequest()` with a synthetic schema request. The latter is more aligned with existing patterns.

Actually, looking at the spec example more closely:
```yaml
plans:
  reconcile-orders:
    orders:
      - select:
          filter-expression: "order_id = ${{ $params.order_id }}"
```

The plan uses `$params` which maps to tool parameters. We need to inject `$params` into the plan context's `$vars`. The simplest approach: add a `ProcessWithParams(params)` method to `Plan`, or modify `Process` to accept initial context vars.

**Recommended approach:** Add `initialVars?: Record<string, unknown>` parameter to `Plan.Process()`. The adapter calls `plan.Process(undefined, { $params: toolArgs })`.

### 4.5 Parameter mapping helpers

**`buildFilterFromParams(args, paramConfigs)`:**
```ts
function buildFilterFromParams(
    args: Record<string, unknown>,
    paramConfigs: Record<string, McpToolParams["parameters"][string]>,
): Record<string, unknown> {
    const filter: Record<string, unknown> = {}
    for (const [paramName, config] of Object.entries(paramConfigs)) {
        const value = args[paramName] ?? config.default
        if (value === undefined && config.required) continue // Zod should catch this
        if (value !== undefined) {
            const fieldName = config.mapsTo ?? paramName
            filter[fieldName] = value
        }
    }
    return filter
}
```

**`buildDataFromParams(args, paramConfigs)`:**
Similar but builds a data object for insert/update. Only includes parameters that map to data fields (not filter-only params).

### 4.6 Sensitive data stripping

Reuse existing `_stripSensitiveFields()` logic. Apply to all `read` tool results.

---

## Phase 5: Hook Rewrite

### 5.1 Rewrite `_hook.ts`

**File:** `apps/server/src/modules/mcp/_hook.ts`

```ts
export function RegisterMiddleware(): void {
    // 1. Always validate tools if mcp.tools exists (even if endpoint disabled)
    McpToolsValidator.Validate()

    // 2. Check endpoint toggle
    const endpoints = ConfigManager.Get("server.endpoints")
    if (!endpoints?.["enable-mcp"]) return

    // 3. Register route
    const route = "/mcp" // fixed per spec
    ServerEndpoint.RegisterMiddleware(() => {
        Logger.Info(`Route: Enabling MCP, URL= ${route}`)
        ServerEndpoint.Api.use(route, Logger.RequestMiddleware, McpRouter)
    })
}
```

---

## Phase 6: Plan.Process Enhancement

### 6.1 Add `initialVars` to `Plan.Process()`

**File:** `apps/server/src/modules/plan/Plan.ts`

Change signature:
```ts
async Process(callerSchema?: string, initialVars?: Record<string, unknown>): Promise<DataTable>
```

In the method body, after creating `$context`:
```ts
$context.$vars = initialVars ?? {}
```

This is a backward-compatible change — existing callers pass no second argument.

---

## Phase 7: Documentation & Cleanup

### 7.1 Update README.md

Rewrite to reflect the new declarative tool system with config examples.

### 7.2 Remove `MCP_TOOL` enum

No longer needed — tools are entirely config-driven.

### 7.3 Update `U_config.ts`

No changes needed beyond what's already in U__mcp — the import stays the same.

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `modules/core/types/U__server.ts` | Edit | Add `endpoints` with `enable-mcp` |
| `modules/mcp/@consts.ts` | Rewrite | Remove `MCP_TOOL` enum, add constants |
| `modules/mcp/types/U__mcp.ts` | Rewrite | Full declarative tool schema |
| `modules/mcp/McpToolsValidator.ts` | **New** | Startup validation for tool declarations |
| `modules/mcp/adapter.ts` | Rewrite | Config-driven tool registration + execution |
| `modules/mcp/_hook.ts` | Rewrite | Use `server.endpoints.enable-mcp`, run validator |
| `modules/mcp/README.md` | Rewrite | Document declarative tool system |
| `modules/mcp/router.ts` | Minor edit | Remove GET/DELETE 405 handlers (simplify) |
| `modules/plan/Plan.ts` | Edit | Add `initialVars` parameter to `Process()` |
| `modules/core/types/U_config.ts` | No change | Import stays the same |

---

## Example Config

```yaml
server:
  port: 3000
  endpoints:
    enable-mcp: true
  authentication:
    provider: local
    default-role: viewer

roles:
  admin: "crudla"
  viewer: "rl"

schemas:
  crm:
    source: my-postgres
    entities:
      users:
        source: my-postgres
        entity: public.users
      orders:
        source: my-postgres
        entity: public.orders

plans:
  reconcile-orders:
    steps:
      - select:
          schema: crm
          entity: orders
          filter-expression: "order_id = ${{ $params.order_id }}"

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
        status:
          type: string
          required: false
          description: "Initial status"
          default: active
    reconcile_orders:
      description: "Cross-reference an order with its shipping status"
      plan: reconcile-orders
      parameters:
        order_id:
          type: string
          required: true
          description: "Order ID to look up"
```
