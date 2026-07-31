---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

<Badge type="default" text="Technical Guide"/>

# Understanding Authentication, Users, and Roles in Metal Server

## Overview of Authentication in Metal Server

Metal Server uses a robust authentication system to verify the identity of users and systems. The authentication process is handled through the `server.authentication` section of the `config.yml` file.

## Authentication Types

Metal Server supports two types of authentication:

- **Local Authentication**: This is the simplest form of authentication, where users provide a username and password to access the system.

```yaml
server:
  authentication:
    type: local # [!code highlight]
```

- **OpenID Connect Authentication**: This type of authentication verifies the identity of users through an OpenID Connect provider, and can be used to assign users to specific roles, which determine what actions they can perform and what data they can access.

```yaml
server:
  authentication:
    type: oidc # [!code highlight]
```

## Local Authentication

### Configuration

To configure authentication in Metal Server, you need to add the following code to the `server.authentication` section of the `config.yml` file:

```yaml
server:
  authentication:
    type: local # [!code highlight]
```

This code enables local authentication for the Metal Server.

It is possible to assign a default role to the authenticated user by adding the following code to the `server.authentication` section of the `config.yml` file:

```yaml
server:
  authentication:
    type: local
    default-role: guest # the role is already created in roles section  # [!code highlight]
```

### User Management

Users are the entities that interact with the Metal Server. Each user has a unique username and password, and can be assigned to one or more roles.

#### Creating Users

To create new users, you need to add the following code to the `users` section of the `config.yml` file:

**Example**

```yaml
users:
  myapiuser:
    password: myStr@ngpa$$w0rd
  guest:
    password: guestpassword
```

This code creates two new users, `mypaiuser` and `guest`, with the specified passwords.

### Role-Based Access Control

Roles are used to determine what actions a user can perform and what data they can access. Each role has a unique name and a set of permissions that define what actions can be performed.

#### Creating Roles

To create a new role, you need to add the following code to the `roles` section of the `config.yml` file:

```yaml
roles:
  admin: ar # ar = admin, read
  all-rights: crudla # crudla = create, read, update, delete, list, admin
  guest: r # r = read
```

This code creates three new roles, `admin`, `all-rights`, and `guest`, with the specified permissions.

**Permissions**

| Permission | Description          |
| ---------- | -------------------- |
| `c`        | Create data          |
| `r`        | Read data            |
| `u`        | Update data          |
| `d`        | Delete data          |
| `a`        | Administrate server  |
| `l`        | List schema entities |

### Assigning Roles to Users

To assign a role to a user, you need to add the following code to the `users` section of the `config.yml` file:

```yaml
users:
  myapiuser:
    password: myStr@ngpa$$w0rd
    roles: [admin, all-rights] # Assign the 'admin' and 'all-rights' roles to myapiuser  # [!code highlight]
  guest:
    password: guestpassword
    roles: [guest] # Assign the 'guest' role to guest  # [!code highlight]
```

This code assigns the `admin` role to the `myapiuser` user and the `guest` role to the `guest` user.

### Final configuration

The final configuration will be:

```yaml
server:
  authentication:
    type: local
    default-role: guest

roles:
  admin: ar
  all-rights: crudla
  guest: r

users:
  myapiuser:
    password: myStr@ngpa$$w0rd
    roles: [admin, all-rights]
  guest:
    password: guestpassword
    roles: [guest]
```

### Troubleshooting

- **Authentication Errors**: Check the `server.authentication` section of the `config.yml` file for any errors or misconfigurations.
- **User Management Issues**: Check the `users` section of the `config.yml` file for any errors or misconfigurations.
- **Role-Based Access Control Issues**: Check the `roles` section of the `config.yml` file for any errors or misconfigurations.

## OpenID Connect Authentication

### Configuration

To configure OIDC authentication in Metal Server, you need to add the following informations to the `server.authentication` section of the `config.yml` file:

| Parameter       | Required | Description                                                              | Metal version                         |
| --------------- | -------- | ------------------------------------------------------------------------ | ------------------------------------- |
| `type`          | Y        | Type of authentication. For OIDC, it should be set to `oidc`.            | <Badge type="default" text="v0.4+" /> |
| `issuer`        | Y        | The URL of the OIDC provider's issuer.                                   | <Badge type="default" text="v0.4+" /> |
| `client-id`     | Y        | The client ID of the OIDC application.                                   | <Badge type="default" text="v0.4+" /> |
| `client-secret` | Y        | The client secret of the OIDC application.                               | <Badge type="default" text="v0.4+" /> |
| `scope`         | N        | The scope of the OIDC authentication. (default: `roles`)                 | <Badge type="default" text="v0.4+" /> |
| `roles-path`    | N        | The path to the roles in the OIDC token. (default: `realm_access.roles`) | <Badge type="default" text="v0.4+" /> |

**Example:**

KeyCloak integration example

```yaml
server:
  authentication:
    type: oidc # [!code highlight]
    issuer: http://127.0.0.1:8080/realms/metal # [!code highlight]
    client-id: metal-server # [!code highlight]
    client-secret: dOQoanZt02oGV4jTjGR4LVudwSJqbujT # [!code highlight]
    scope: roles # [!code highlight]
    roles-path: realm_access.roles # [!code highlight]
    default-role: guest # the role is already created in roles section  # [!code highlight]
```

This code enables authentication with KeyCloak.

### Role-Based Access Control

Roles are used to determine what actions a user can perform and what data they can access.
Each role has a unique name and a set of permissions that define what actions can be performed.

#### Creating Roles

To create a new role, you need to add the following code to the `roles` section of the `config.yml` file:

```yaml
roles:
  admin: ar # ar = admin, read
  all-rights: crudla # crudla = create, read, update, delete, list, admin
  guest: r # r = read
```

This code creates three new roles, `admin`, `all-rights`, and `guest`, with the specified permissions.

**Permissions**

| Permission | Description          |
| ---------- | -------------------- |
| `c`        | Create data          |
| `r`        | Read data            |
| `u`        | Update data          |
| `d`        | Delete data          |
| `a`        | Administrate server  |
| `l`        | List schema entities |

### Assigning Roles to Users

To assign a role to a user in OpenID Connect authentication, you need to create the same roles in the OpenID Connect provider and assign them to users. This ensures that the roles are properly synchronized between the OpenID Connect provider and Metal Server, allowing for seamless role-based access control.

### Final configuration

The final configuration will be:

```yaml
server:
  authentication:
    type: oidc
    issuer: http://127.0.0.1:8080/realms/metal
    client-id: metal-server
    client-secret: dOQoanZt02oGV4jTjGR4LVudwSJqbujT
    scope: roles
    roles-path: realm_access.roles
    default-role: guest

roles:
  admin: ar
  all-rights: crudla
  guest: r
```

### Troubleshooting

- **Authentication Errors**: Check the `server.authentication` section of the `config.yml` file for any errors or misconfigurations.
- **Role-Based Access Control Issues**: Check the `roles` section of the `config.yml` file for any errors or misconfigurations.

## Conclusion

In this technical guide, we have explored the concept of authentication, users, and roles in Metal Server. We have seen how to configure authentication, create new users and roles, and assign roles to users.

By understanding these features, you can create a secure and controlled environment for your users to interact with your data.
