---
description: "How to design MCP tools in Metal"
---

# MCP Tools Guide

Metal exposes schema-driven tools through the MCP endpoint. Each tool is declared in the YAML config under `mcp.tools` and can read, create, update, delete, or list data from a schema entity.

::: tip ℹ️ NOTE
For more detailed information about how to configure `mcp` section , See: [Configuration File Reference: mcp](../documentation/config-yml#mcp)
:::

## 1. Core idea

An MCP tool maps an LLM-friendly input shape to a Metal schema operation.

A tool definition has three main parts:

- `schema`: the Metal schema to target
- `entity`: the entity inside that schema (except for `list` tools)
- `arguments`: the input arguments accepted by the tool

## 2. JSON and structure arguments: two supported patterns

For `json` and `structure` arguments, Metal supports two mutually exclusive patterns:

### Pattern A — single-field payload (`json`)

Use this when the argument should be stored as one value in the target row.

```yaml
mcp:
  tools:
    create_contact:
      description: Create a contact
      schema: crm
      entity: contact
      action: create
      arguments:
        contact:
          type: json
          description: Contact payload
          map-to: contact
```

Typical use case:
- the tool receives a nested JSON object that should be written to one column
- the object is effectively a single field, such as a serialized payload

### Pattern B — structured remapping container (`structure`)

Use this when the object should be unpacked into multiple row fields.

```yaml
mcp:
  tools:
    create_contact:
      description: Create a contact
      schema: crm
      entity: contact
      action: create
      arguments:
        contact:
          type: structure
          description: Contact details
          properties:
            first_name:
              type: string
              description: First name
              map-to: first_name
            company_name:
              type: string
              description: Company name
              map-to: company
```

Typical use case:
- the tool accepts a structured object such as a contact or address payload
- each field should be mapped to a different destination field in the row

> In practice, Pattern B is the most common and industry-friendly approach for tool-driven CRUD operations.

## 3. Common use cases

### A. Simple create tool

```yaml
mcp:
  tools:
    create_customer:
      description: Create a customer record
      schema: crm
      entity: customer
      action: create
      arguments:
        name:
          type: string
          description: Customer full name
          map-to: name
          required: true
        email:
          type: string
          description: Customer email
          map-to: email
```

Use this when the tool maps a small number of flat fields.

### B. Structured contact tool

```yaml
mcp:
  tools:
    create_contact:
      description: Create a contact record
      schema: crm
      entity: contact
      action: create
      arguments:
        contact:
          type: structure
          description: Contact details
          properties:
            first_name:
              type: string
              description: First name
              map-to: first_name
            last_name:
              type: string
              description: Last name
              map-to: last_name
            company_name:
              type: string
              description: Company name
              map-to: company
```

Use this when one input object should populate multiple columns.

### C. Read tool with filters

```yaml
mcp:
  tools:
    find_orders:
      description: Find orders by customer id
      schema: sales
      entity: orders
      action: read
      arguments:
        customer_id:
          type: string
          description: Customer identifier
          map-to: customer_id
```

Use this when the tool should fetch rows using one or more filters.

### D. List tool

```yaml
mcp:
  tools:
    list_customers:
      description: List customers
      schema: crm
      action: list
```

Use this when the tool should expose the available entities in a schema.

## 4. Recommended design principles

- Prefer `structure` arguments with `properties` for structured input objects.
- Use `json` with `map-to` only when the argument is a single payload field.
- Keep argument names close to the business concept, not the storage column name.
- Use `required: true` for values the tool cannot work without.
- Keep nested objects shallow and explicit for LLM readability.

## 5. Validation rules

Metal validates MCP tool configs at startup. `json` and `structure` arguments must follow one of these two shapes:

- `json` with `map-to` for a single-field payload
- `structure` with `properties` for a structured remapping container

Mixing both styles is rejected. Additionally, `json` arguments require `map-to` and `structure` arguments require at least one property.
