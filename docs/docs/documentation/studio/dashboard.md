---
description: "Monitor your Metal Server health and activity from Studio"
---

# Dashboard

The Dashboard monitors the health and activity of your Metal Server. It is organized in tabs:

| Tab | Purpose |
| --- | ------- |
| [Overview](#overview) | Global health summary of the server |
| [HTTP](#http) | HTTP request traffic |
| [Sources](#sources) | Data source connections and their status |
| [Schemas](#schemas) | Schema performance and entity activity |
| [Plans](#plans) | ETL pipeline executions |
| [Schedules](#schedules) | Cron-based job executions |

## Overview

Summary cards show the current health of the server, plans, HTTP traffic, sources and schedules. Metrics refresh automatically.

## HTTP

Detailed view of HTTP requests handled by the server, grouped by method and status, useful to spot errors and bottlenecks.

## Sources

Status and activity of every configured data source.

## Schemas

Performance and entity activity per schema.

## Plans

Monitor and manage ETL pipeline executions, including their status and runtime. See [Plans](../config-yml#plans) for the underlying configuration.

## Schedules

Real-time status of scheduled jobs. See [Scheduler](../studio/scheduler) to manage the schedules themselves.
