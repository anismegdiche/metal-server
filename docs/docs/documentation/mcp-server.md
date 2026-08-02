---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

# Metal MCP Server

Metal offers an MCP (Model Context Protocol) server that exposes Metal schemas and entities as MCP tools callable by LLM clients.

This endpoint serves as the entry point for MCP operations.
It exposes Metal schemas and entities as MCP tools that can be called by LLM clients.

The MCP endpoint must be enabled in the configuration file with [`server.endpoints.enable-mcp`](config-yml#endpoints).

The table below describes available endpoints and methods to use for request :

| Endpoint | Method | Usage                                                                            | Metal version                         |
| -------- | ------ | -------------------------------------------------------------------------------- | ------------------------------------- |
| `/mcp`   | POST   | Handle MCP JSON-RPC 2.0 requests (e.g. `initialize`, `tools/list`, `tools/call`) | <Badge type="info" text="v0.5+" /> |

## `/mcp`

Metal uses the MCP **Streamable HTTP** transport. Each request is a JSON-RPC 2.0 message sent with `Content-Type: application/json`, and the response is either a JSON-RPC message or an SSE stream (`text/event-stream`).

Authentication is required. Provide the Metal token with the `Authorization: Bearer <token>` header (see [`/user/login`](rest-api#userlogin)).

**Endpoint**

> **POST** /mcp

**Headers**

| Name          | Required | Description                              |
| ------------- | -------- | ---------------------------------------- |
| Authorization | Y        | Bearer token obtained from `/user/login` |
| Content-Type  | Y        | `application/json`                       |
| Accept        | N        | `application/json` or `text/event-stream`|

**Body Parameters**

The body is a standard MCP JSON-RPC 2.0 message:

| Name      | Type   | Required | Description                                                |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| `jsonrpc` | string | Y        | Protocol version, must be `"2.0"`                          |
| `method`  | string | Y        | MCP method (e.g. `initialize`, `tools/list`, `tools/call`) |
| `params`  | object | N        | Method parameters                                          |
| `id`      | string | Y        | Request identifier, echoed in the response                 |

**Example**

> To initialize an MCP session:
>
> **Request**
>
> ```http
> POST http://127.0.0.1:3000/mcp
> Authorization: Bearer <token>
> Content-Type: application/json
>
> {
>   "jsonrpc": "2.0",
>   "id": 1,
>   "method": "initialize",
>   "params": {
>     "protocolVersion": "2025-03-26",
>     "capabilities": {},
>     "clientInfo": {
>       "name": "my-client",
>       "version": "1.0.0"
>     }
>   }
> }
> ```
>
> **Response**
>
> ```http
> HTTP/1.1 200 OK
> Content-Type: application/json
>
> {
>   "jsonrpc": "2.0",
>   "id": 1,
>   "result": {
>     "protocolVersion": "2025-03-26",
>     "capabilities": {},
>     "serverInfo": {
>       "name": "Metal",
>       "version": "..."
>     }
>   }
> }
> ```

> To list the available tools:
>
> **Request**
>
> ```http
> POST http://127.0.0.1:3000/mcp
> Authorization: Bearer <token>
> Content-Type: application/json
>
> {
>   "jsonrpc": "2.0",
>   "id": 2,
>   "method": "tools/list"
> }
> ```

**Response Errors**

| HTTP Code | Message                      |
| --------- | ---------------------------- |
| 400       | Bad Request                  |
| 401       | Invalid username or password |
| 403       | Forbidden                    |
| 500       | Something Went Wrong         |

::: tip ℹ️ NOTE
MCP tools are declared declaratively in the `mcp` section of the configuration file. 

For details, see :
* [Configuration File Reference: mcp](config-yml#mcp)
* [MCP Tools Guide](../guides/mcp-tools).
:::
