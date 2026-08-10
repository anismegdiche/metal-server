---
layout: home
title: Middleware - ETL - AI
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"

hero:
  name: Metal
  text: One API for every database,<br/>file, and AI agent
  image:
    src: /metal-logo-icon.png
    alt: Metal logo
  tagline: Free, open-source middleware that connects your app to any data source — and exposes it to AI agents — without writing another connector.
  actions:
    - theme: brand
      text: Get Started
      link: /documentation/get-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/anismegdiche

link: https://github.com/anismegdiche

features:
  - icon: "<i class='fa-solid fa-network-wired' style='color:var(--color-red)'></i>"
    title: Stop writing connectors
    details: One unified REST API for MS SQL Server, PostgreSQL, MySQL, MariaDB, and more. Swap or add a data source without touching your application code.
  - icon: "<i class='fa-solid fa-robot' style='color:var(--color-red)'></i>"
    title: Make your data AI-ready
    details: Expose schemas and entities as MCP tools that LLM clients and AI agents can call directly, with granular per-tool access control.
  - icon: "<i class='fa-solid fa-sitemap' style='color:var(--color-red)'></i>"
    title: Control what each client sees
    details: Virtualize schemas to deliver different schema names and user credentials per consumer, without duplicating your data.
  - icon: "<i class='fa-solid fa-arrows-spin' style='color:var(--color-red)'></i>"
    title: Transform data, on your schedule
    details: Apply transformations at runtime or on a schedule, and let Metal surface patterns and anomalies automatically.
---

<script setup>
import FancySection from '.vitepress/theme/components/FancySection.vue'
import LogoSection from '.vitepress/theme/components/LogoSection.vue'
</script>
<style>
.heading .clip {
  font-size: 4.5rem;
  line-height: 6rem;
  text-transform: capitalize;
}

.heading .text {
  font-size: 2.25rem;
  line-height: 2.6rem;
}

.stats-bar {
  display: flex;
  justify-content: center;
  gap: 3rem;
  flex-wrap: wrap;
  margin: 2rem auto 3rem;
  text-align: center;
}

.stats-bar .stat-number {
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--color-red);
  display: block;
}

.stats-bar .stat-label {
  font-size: 0.9rem;
  opacity: 0.75;
}

.quickstart-link {
  display: inline-block;
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--color-red);
}

.VPBadge {
  font-size: 1.2rem;
  padding: 0.5em;
  border-radius:100%;
  width:2em;
  height:2em;
  text-align:center;
}
</style>

<!--
  QUICKSTART — real example from the "PostgreSQL Database HTTP API" guide.
  Source: /guides/postgresql-http-api.html
-->
<h1 class="h-red">Query Any Data, Same API</h1>

::: half
#### <Badge type="info" text="1" /> Point Metal at a PostgreSQL database
**`config.yml`**
```yaml
sources:
  pg-northwind:
    provider: postgres
    host: pg-northwind
    port: 5432
    user: admin
    password: "123456"
    database: northwind

schemas:
  northwind:
    source: pg-northwind
```
:::

::: half
#### <Badge type="info" text="2" /> GET customers — no ORM, no driver, just REST
**`Request`**
```bash
curl http://localhost:3000/schema/northwind/customers \
  --header 'authorization: Bearer <token>'
```
**`Response`**
```json
{
  "schema": "northwind",
  "entity": "customers",
  "status": 200,
  "fields": {
    "customer_id": "string",
    "company_name": "string",
    "contact_name": "string",
    "city": "string",
    "country": "string"
  },
  "rows": [
    {
      "customer_id": "ALFKI",
      "company_name": "Alfreds Futterkiste",
      "contact_name": "Maria Anders",
      "city": "Berlin",
      "country": "Germany"
    }
  ]
}
```
<a href="/guides/postgresql-http-api.html" class="quickstart-link">See the full guide, including auth setup →</a>
:::
<!--
  MCP QUICKSTART — config pattern from the "MCP Tools Guide"
  (../guides/mcp-tools.html), reusing the same northwind/customers
  data as the REST example above for continuity.
  NOTE: the tools/call request and response below follow the public
  MCP JSON-RPC spec (method: tools/call). Verify the exact response
  envelope against Metal's live MCP endpoint before publishing —
  this wasn't taken verbatim from a Metal doc example.
-->
<h1 class="h-red">Same Data, as an AI Tool</h1>

::: half
#### <Badge type="info" text="1" /> Expose it as an MCP tool
**`config.yml`**
```yaml
mcp:
  tools:
    find_customer:
      description: Find a customer by id
      schema: northwind
      entity: customers
      action: read
      arguments:
        customer_id:
          type: string
          description: Customer identifier
          map-to: customer_id
          required: true
```
:::

::: half
#### <Badge type="info" text="2" /> Call it from any MCP client, no custom tool code
**`Request`**
```json
{
  "method": "tools/call",
  "params": {
    "name": "find_customer",
    "arguments": { "customer_id": "ALFKI" }
  }
}
```
**`Response`**
```json
event: message
data: {
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{ \"customer_id\": \"ALFKI\", \"company_name\": \"Alfreds Futterkiste\", \"city\": \"Berlin\", \"country\": \"Germany\" }"
      }
    ]
  },
  "jsonrpc":"2.0",
  "id":3
}
```
<a href="/guides/mcp-tools.html" class="quickstart-link">See the full MCP Tools guide →</a>
:::

<!--
  STATS BAR — 16+ is a real count from data-providers-config.html:
  mssql, postgres, mysql, mongodb, cosmosdb, metal, plan, memory (8)
  + files provider's 7 storage backends (fs, ftp, smb, s3, az-blob, az-file, az-datalake)
  + webservice (rest/soap, covers any external API) = 16.
  Recount before publishing if new providers are added.
-->
<!-- <div class="stats-bar">
  <div>
    <span class="stat-number">20+</span>
    <span class="stat-label">data sources supported</span>
  </div>
  <div>
    <span class="stat-number">1</span>
    <span class="stat-label">API for all of them</span>
  </div>
</div> -->

<h1 class="h-red">Endless Integration Possibilities</h1>
<LogoSection />

<h1 class="h-red">Fits the Architecture You Already Have</h1>

#### Metal decouples your business logic from your data infrastructure — add, remove, or swap data sources without rewriting application code.


<FancySection image="/archi/hexagonal.png">
<h2 class="index-h2">Hexagonal Architecture</h2> Metal focus on abstraction, unified interfaces, and separation of concerns, makes it a good fit for applications designed using hexagonal architecture. It can serve as a valuable component in isolating your core business logic from the complexities of data access and management.
</FancySection>

<FancySection image="/archi/microservices.png" reverse>
<h2 class="index-h2">Microservices Architecture</h2>
Metal's ability to abstract database access and provide a unified API makes it suitable for microservices. Each microservice can use Metal to interact with its data store without needing to implement database-specific logic. Metal can also help with data integration between microservices.
</FancySection>

<FancySection image="/archi/api-gateway.webp">
<h2 class="index-h2">API Gateway Pattern</h2>
Metal can act as a backend-for-frontend (BFF) or API gateway, providing a unified API for client applications while handling the complexities of interacting with different databases and data sources. This simplifies the client-side development and allows for more flexibility in the backend.
</FancySection>

<FancySection image="/archi/datalake.webp" reverse>
<h2 class="index-h2">Data Lake/Data Mesh Architecture</h2>
Metal's capability to merge schemas from multiple databases and data providers makes it useful in a data lake or data mesh environment. It can provide a unified view of data across different data sources, enabling data analysis and reporting.
</FancySection>

<FancySection image="/archi/layered.png">
<h2 class="index-h2">Layered Architecture</h2>
Metal fits well within a layered architecture, acting as a data access layer that abstracts the complexities of database interactions from the business logic layer.
</FancySection>