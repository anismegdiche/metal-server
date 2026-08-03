---
description: "Create and edit MCP tools with a visual editor in Studio"
---

# MCP Tools

The MCP Tools screen is a visual editor for the tools exposed by the [Metal MCP Server](../mcp-server). It reads and writes the same `mcp` section of the [configuration file](../config-yml#mcp) — the exact same tools you could declare in YAML.

::: tip ℹ️ NOTE
MCP tools only take effect when the MCP endpoint is enabled on the server:

```yaml
server:
  endpoints:
    enable-mcp: true
```

:::

## Create / edit a tool

Each tool is defined by:

| Field | Description |
| ----- | ----------- |
| Name | Tool name as exposed by the MCP server |
| Description | Human-readable description shown to the LLM client |
| Schema | The Metal schema the tool operates on |
| Action | `read`, `create`, `update`, `delete` or `list` |
| Entity | Target entity (not required for `list` tools) |
| Limit | Maximum number of rows returned for `read`/`list` tools |
| Fields | Fields to return for `read` tools |

## Arguments

Arguments define the input shape the tool accepts. Supported argument types:

| Type | Description |
| ---- | ----------- |
| `string` / `number` / `boolean` | Scalar value mapped to a field with `map-to` |
| `array` | List of items, with an optional `items` type |
| `json` | Single-field payload mapped with `map-to` |
| `structure` | Structured container remapped to many fields through `properties` |

For each argument you can also set:

- `required` — whether the argument is mandatory
- `enum` — comma-separated allowed values (scalar types)
- `map-to` — the target field in the schema entity

> For `structure` arguments, define child `properties` instead of `map-to`. For `array` arguments, choose the item type.

## Under the hood

Studio stores the tool in the `mcp.tools` configuration section and reloads the server, exactly like the [YAML declarations](../config-yml#mcp). For design guidance, see the [MCP Tools Guide](../../guides/mcp-tools).
