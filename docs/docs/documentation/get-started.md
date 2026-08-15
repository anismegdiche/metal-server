---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

# Get Started with Metal

::: warning ⚠️ BEFORE YOU START
Please note that Metal As It Is is currently in the prototype phase, undergoing rigorous testing and refinement. This phase allows for experimentation, feature validation, and fine-tuning to ensure the final product meets the highest standards.

It is strongly discouraged to deploy Metal As It Is in a production environment at this stage, as the prototype is intended for testing purposes and may not yet have the stability and reliability required for production use.
:::

## System Installation

Install and run Metal directly on your system. For a containerized alternative, see [Docker Installation](#docker-installation).

### What's included in the Metal release repository?

The Metal release repository contains two components:

- **Metal Server** — the core engine: a middleware, ETL & AI server exposing a unified REST API, plan-based ETL pipelines, an MCP server, and more.
- **Metal Studio** — the official web-based management interface for Metal Server, used to configure, monitor, and interact with your server visually.

You can run Metal Server on its own and configure everything with YAML, or run Studio on top for a visual experience. See [Metal Studio](studio/) for details.

### Prerequisites

Before diving into Metal, make sure your environment meets the following prerequisites:

- [Node.js](https://nodejs.org/) 24.16.0
- [Git](https://git-scm.com/) 2.42 or newer
- [Yarn](https://yarnpkg.com/) 4.17.1 or newer

### Installation

1. Clone the Metal distribution repository:

   ```bash
   git clone https://github.com/anismegdiche/metal.git
   ```

2. Navigate to the project folder:

   ```bash
   cd metal
   ```

3. Install the required packages:

   ```bash
   yarn install
   ```

4. Configure your `config.yml` file located in the **./config** folder.
   ::: tip ℹ️ NOTE
   For detailed configuration options, refer to the [Configuration File Reference](config-yml).
   :::

   Optional environment variables like Server data path can be set in a root `.env` file — see [Environment Variables](env).

### Run Metal Server

Start the server in production mode (builds then runs):

```bash
yarn server
```

### Verification

Ensure that the server is running by using a tool like cURL:

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


### Run Metal Studio

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


## Docker Installation

As an alternative to running Metal on your system, both Metal Server and Metal Studio are published as ready-to-use Docker images on [Docker Hub](https://hub.docker.com/):

- **metal-server** — the Metal Server image
- **metal-studio** — the Metal Studio image

### Prerequisites

- [Docker](https://www.docker.com/) with [Docker Compose](https://docs.docker.com/compose/) v2 or newer

### Run Metal with Docker

1. Create a working folder and a `docker-compose.yml` file:

   ```yaml
   services:
     server:
       image: metal-server
       ports:
         - "3000:3000"
       volumes:
         - ./metal-config:/metal/config
     studio:
       image: metal-studio
       environment:
         SERVER_ADDRESS: http://server:3000
       ports:
         - "5000:5000"
   ```

2. Create the `metal-config` folder and place your `config.yml` inside it:

   ```bash
   mkdir metal-config
   ```

   This folder is mounted to `/metal/config` inside the server container, which is where the server loads its configuration from.

   ::: tip ℹ️ NOTE
   For detailed configuration options, refer to the [Configuration File Reference](config-yml).
   :::

3. Pull and start the containers:

   ```bash
   docker compose up -d
   ```

   - **server** — Metal Server, exposed on port `3000`
   - **studio** — Metal Studio, exposed on port `5000`

4. Verify that the server is running:

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

5. Open `http://localhost:5000` in your browser to access Metal Studio. The Studio container is pre-configured to reach the server at `http://server:3000` via the `SERVER_ADDRESS` environment variable.

### Managing the containers

```bash
docker compose pull          # update to the latest images
docker compose logs -f       # follow the container logs
docker compose stop          # stop the containers
docker compose down          # stop and remove the containers
```

### Persisting runtime data

Runtime data (DataTables, API keys, sessions, AI models, logs, ...) is written to `/metal/data` inside the server container and is lost when the container is removed. To keep it across container restarts, mount a volume:

```yaml
services:
  server:
    volumes:
      - ./metal-config:/metal/config
      - ./metal-data:/metal/data
```

The default runtime paths can be overridden with environment variables such as `DATATABLES_PATH`, `API_KEYS_PATH`, `SESSIONS_PATH`, `AI_MODELS_PATH`, and `LOGS_PATH` (see [Environment Variables](env)).

## Configuration vs YAML

Everything you configure in Studio (sources, schemas, MCP tools, users, roles, schedules, server settings) is stored in the same server configuration you would edit by hand in YAML. Use whichever workflow you prefer:

- **YAML first** — declare your configuration in the configuration file, then use Studio to monitor and adjust it.
- **Studio first** — create and edit items visually, and Studio writes them back to the server configuration. 

