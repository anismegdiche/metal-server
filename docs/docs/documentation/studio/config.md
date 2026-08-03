---
description: "View and edit the Metal Server configuration from Studio"
---

# Config

The Config screen groups everything related to the server configuration. It is organized in tabs:

| Tab | Purpose |
| --- | ------- |
| [Info](#info) | Server and system information |
| [Server](#server) | Edit the `server` section of the configuration |
| [Users & Roles](#users--roles) | Manage users and roles |
| [API Keys](#api-keys) | Manage API keys for programmatic access |

## Info

Read-only cards showing the server version, platform, Node.js version, uptime, hostname, CPU and memory, plus the active server settings (port, authentication, timezone, response chunk).

## Server

Edit the `server` section of the [configuration file](../config-yml#server) from a form: port, timezone, verbosity, request/response limits, response chunk, response rate, cache and AI engines. Saving the form writes the changes to the server configuration and triggers a reload.

## Users & Roles

Manage the `users` and `roles` sections of the [configuration file](../config-yml#roles):

- **Add / edit / delete users** and assign roles to them.
- **Add / edit / delete roles** with their permission set (`a`, `l`, `c`, `r`, `u`, `d`).

See [Understanding Authentication, Users, and Roles](../../guides/authentication) for the permission model.

## API Keys

Create and revoke API keys for programmatic access to the server, and list existing keys with their status.
