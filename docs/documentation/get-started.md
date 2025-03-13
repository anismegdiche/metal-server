---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---
# Get Started

::: warning ⚠️ BEFORE YOU START
Please note that Metal As It Is is currently in the prototype phase, undergoing rigorous testing and refinement. This phase allows for experimentation, feature validation, and fine-tuning to ensure the final product meets the highest standards. 

It is strongly discouraged to deploy Metal As It Is in a production environment at this stage, as the prototype is intended for testing purposes and may not yet have the stability and reliability required for production use.
:::

## Prerequisites

Before diving into Metal Server, make sure your environment meets the following prerequisites:

- [Node.js](https://nodejs.org/) 22.13.0
- [Git](https://git-scm.com/) 2.42 or newer

## Installation

1. Clone the Metal Server repository:

    ```bash
    git clone https://github.com/anismegdiche/metal-server.git
    ```

2. Navigate to the project directory:

    ```bash
    cd metal-server
    ```

3. Install required packages using npm:

    ```bash
    npm install
    ```

4. Prepare dependencies using npm:

    ```bash
    npm run prepare
    ```

5. Compile the scripts:

    ```bash
    npx tsc
    ```

6. Configure your `config.yml` file located in the **./config** folder.
   ::: tip ℹ️ NOTE
   For detailed configuration options, refer to the [Configuration File Reference](config-yml.md).
   :::

7. Start the server:

    ```bash
    npm run prod
    ```

## Verification

Ensure that the server is running by using a tool like CURL:

```bash
curl http://localhost:3000/server/info
```

You should receive a response similar to the following:

```json
{
    "server":"Metal",
    "version":"0.4"
}
```

Congratulations! You have successfully set up and verified your Metal Server installation.

## Swagger UI

You may use the [Swagger UI](https://swagger.io/docs/open-source-tools/swagger-ui) to visualize and test the API documentation. This powerful tool allows you to:

* Explore the API endpoints and their respective parameters
* Test API requests directly from the interface
* View detailed information about each endpoint, including response formats and error handling

The Swagger UI is available at `http://localhost:3000/api-docs`. Simply navigate to this URL in your web browser to access the interface.