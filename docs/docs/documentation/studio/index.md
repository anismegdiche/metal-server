---
description: "Metal Studio - the web interface to manage your Metal Server"
---

# Metal Studio

Metal Studio is the official web-based management interface for **Metal Server**. It is a GUI on top of the core engine: Metal remains a **Middleware, ETL & AI** server, and Studio gives you a visual way to configure it, monitor it, and interact with your data.

You can run Metal Server on its own and configure everything with YAML, or install Studio on top for a visual management experience — both manage the same engine and the same configuration.

## What you can do in Studio

| Area                   | Purpose                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| [Dashboard](dashboard) | Monitor server health and activity: overview, HTTP traffic, sources, schemas, plans and schedules. |
| [Data](data)           | Manage sources and schemas, and browse your data.                                                  |
| [MCP Tools](mcp-tools) | Create and edit MCP tools with a visual editor.                                                    |
| [Designer](designer)   | Build and manage ETL plans.                                                                        |
| [Scheduler](scheduler) | Configure schedules for plan execution.                                                            |
| [Config](config)       | View server info and edit the server, users & roles, and API keys configuration.                   |
| [Logs](logs)           | Browse server logs.                                                                                |

## Server-only or Server + Studio?

|               | Server only                                | Server + Studio                                             |
| ------------- | ------------------------------------------ | ----------------------------------------------------------- |
| Installation  | Install and run Metal Server               | Run Metal Server **and** Studio                             |
| Configuration | Edit `config.yml` manually                 | Edit YAML **or** use the Studio UI                          |
| Monitoring    | REST API / logs                            | Real-time dashboards, metrics and logs viewer               |
| Suitable for  | Headless, automated, API-first deployments | Visual management, monitoring and day-to-day administration |
