---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

# Environment Variables

Metal reads runtime configuration from environment variables defined in a `.env` file located at the **root** of the repository. A template with the recommended variables is provided in `.env.example`.


::: tip ℹ️ RELATIVE PATHS
Path variables are used as-is. Relative paths (e.g. `./data/tables`) are resolved against the **current working directory** of the process, so they are most reliable when Metal is started from the repository root.
:::


## Server variables

| Variable          | Description                        | Default           |
| ----------------- | ---------------------------------- | ----------------- |
| `METRICS_DB_PATH` | Persistent metrics store directory | `./data/metrics`  |
| `DATATABLES_PATH` | Temporary data tables directory    | `./data/tables`   |
| `AI_MODELS_PATH`  | AI models directory                | `./data/models`   |
| `API_KEYS_PATH`   | API keys storage directory         | `./data/api-keys` |
| `LOGS_PATH`       | Log files directory                | `./data/logs`     |
| `SESSIONS_PATH`   | Session storage directory          | `./data/sessions` |


## Studio variables


| Variable         | Description                             | Default                 |
| ---------------- | --------------------------------------- | ----------------------- |
| `SERVER_ADDRESS` | Metal server address used by the studio | `http://localhost:3000` |
