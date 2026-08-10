---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

# Get Started with Metal

::: warning ⚠️ BEFORE YOU START
Please note that Metal As It Is is currently in the prototype phase, undergoing rigorous testing and refinement. This phase allows for experimentation, feature validation, and fine-tuning to ensure the final product meets the highest standards.

It is strongly discouraged to deploy Metal As It Is in a production environment at this stage, as the prototype is intended for testing purposes and may not yet have the stability and reliability required for production use.
:::

## What is in Metal repo?

Metal repo ships two components:

- **Metal Server** — the core engine: a middleware, ETL & AI server exposing a unified REST API, plan-based ETL pipelines, an MCP server, and more.
- **Metal Studio** — the official web-based management interface for Metal Server, used to configure, monitor, and interact with your server visually.

You can run Metal Server on its own and configure everything with YAML, or run Studio on top for a visual experience. See [Metal Studio](studio/) for details.

## Prerequisites

Before diving into Metal, make sure your environment meets the following prerequisites:

- [Node.js](https://nodejs.org/) 24.13.0
- [Git](https://git-scm.com/) 2.42 or newer
- [Yarn](https://yarnpkg.com/) 4 (managed through [Corepack](https://nodejs.org/api/corepack.html), which ships with Node.js)

## Installation

1. Clone the Metal repository:

   ```bash
   git clone https://github.com/anismegdiche/metal-server.git
   ```

2. Navigate to the project folder:

   ```bash
   cd metal-server
   ```

3. Install the required packages:

   ```bash
   yarn install
   ```

4. Configure your `config.yml` file located in the **./config** folder.
   ::: tip ℹ️ NOTE
   For detailed configuration options, refer to the [Configuration File Reference](config-yml).
   :::

   Optional environment variables (server address, studio host/port, data paths, ...) can be set in a root `.env` file — see [Environment Variables](env).

## Run Metal Server

Start the server in production mode (builds then runs):

```bash
yarn server
```

### Verification

Ensure that the server is running by using a tool like CURL:

```bash
curl http://127.0.0.1:3000/api/server/info
```

You should receive a response similar to the following:

```json
{
  "server": "Metal",
  "version": "0.5"
}
```
Congratulations! You have successfully set up and verified your Metal Server installation.

### Swagger UI

You may use the [Swagger UI](https://swagger.io/docs/open-source-tools/swagger-ui) to visualize and test the API documentation. This powerful tool allows you to:

- Explore the API endpoints and their respective parameters
- Test API requests directly from the interface
- View detailed information about each endpoint, including response formats and error handling

The Swagger UI is available at `/api-docs`. Simply navigate to this URL in your web browser to access the interface.


## Run Metal Studio

Metal Studio runs on its own HTTP server (default port: `5000`).

Start Studio in production mode (builds then runs):

```bash
yarn studio
```

Open `http://localhost:5000` in your browser, then sign in with the users and roles configured in your server configuration.

::: tip ℹ️ NOTE
If your Metal Server is not running on `http://localhost:3000`, point Studio to it with the `SERVER_ADDRESS` environment variable (see [Environment Variables](env)).
:::

### Login

Studio authenticates against the Metal Server using the users and roles configured in the server configuration (see [Authentication](../guides/authentication)).

1. Open Studio and go to the login page.
2. Enter the username and password of a Metal user.
3. You are redirected to the Dashboard.


### Configuration vs YAML

Everything you configure in Studio (sources, schemas, MCP tools, users, roles, schedules, server settings) is stored in the same server configuration you would edit by hand in YAML. Use whichever workflow you prefer:

- **YAML first** — declare your configuration in the configuration file, then use Studio to monitor and adjust it.
- **Studio first** — create and edit items visually, and Studio writes them back to the server configuration.

