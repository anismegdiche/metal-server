---
description: "Install and run Metal Studio"
---

# Get Started with Metal Studio

## Prerequisites

- [Node.js](https://nodejs.org/) 24.13.0
- A running **Metal Server** (see [Get Started](../get-started))

## Installation

1. Clone the Metal repository:

   ```bash
   git clone https://github.com/anismegdiche/metal-server.git
   cd metal-server
   ```

2. Install the dependencies:

   ```bash
   yarn install
   ```

## Run Studio

Studio runs on its own HTTP server (default dev port: `5000`).

```bash
yarn studio:dev
```

Open `http://localhost:5000` in your browser.

::: tip ℹ️ NOTE
If your Metal Server is not running on `http://127.0.0.1:3000`, point Studio to it with the `NUXT_METAL_SERVER_URL` environment variable:

```bash
NUXT_METAL_SERVER_URL=http://my-server-host:3000 yarn studio:dev
```

:::

## Login

Studio authenticates against the Metal Server using the users and roles configured in the server configuration (see [Authentication](../../guides/authentication)).

1. Open Studio and go to the login page.
2. Enter the username and password of a Metal user.
3. You are redirected to the Dashboard.

## Production build

To build Studio for production:

```bash
yarn workspace studio build
```

Preview the production build:

```bash
yarn workspace studio preview
```

## Configuration vs YAML

Everything you configure in Studio (sources, schemas, MCP tools, users, roles, schedules, server settings) is stored in the same server configuration you would edit by hand in YAML. Use whichever workflow you prefer:

- **YAML first** — declare your configuration in the configuration file, then use Studio to monitor and adjust it.
- **Studio first** — create and edit items visually, and Studio writes them back to the server configuration.
