---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

# Container Provider Configurations

This document provides **valid configuration examples** for different container platforms and environments. Deprecated or unsupported configurations (e.g., direct Docker socket access in AKS/EKS/GKE) have been removed.

## Kubernetes (Generic)

Kubernetes clusters (including AKS, EKS, and GKE) no longer expose a Docker socket or Docker API directly. Instead, use the platform's **container registry** and authentication mechanisms.

**Recommended:** Push/pull images via a registry (ACR, ECR, GCR/Artifact Registry) and authenticate using managed identities, IAM roles, or workload identities.


## Azure AKS Configuration

Use **Azure Container Registry (ACR)** with managed identity or service principal authentication.

```yaml
server:
  ai-engines:
    ...
    params:
      registry: 'your-registry.azurecr.io'
      username: 'your-acr-username'   # Prefer Managed Identity instead of raw credentials
      password: 'your-acr-password'
```

::: tip ℹ️ NOTE
Use [AKS Managed Identity integration with ACR](https://learn.microsoft.com/azure/aks/cluster-container-registry-integration) whenever possible.
:::


## AWS ECS/EKS Configuration

Use **Amazon ECR** for image storage and IAM-based authentication.

```yaml
server:
  ai-engines:
    ...
    params:
      registry: '<account-id>.dkr.ecr.<region>.amazonaws.com'
      auth: 'ecr-iam'  # Use IAM role or kube2iam/IRSA
```

::: tip ℹ️ NOTE
Direct connections to ECS/EKS nodes on ports 2375/2376 are not supported.
:::


## Google Cloud Platform (GKE)

Use **Artifact Registry** or **GCR** for image management with workload identity authentication.

```yaml
server:
  ai-engines:
    ...
    params:
      registry: 'region-docker.pkg.dev/project-id/repository'
      auth: 'gcp-workload-identity'  # Uses GCP Workload Identity or service account key
```

::: tip ℹ️ NOTE
GKE Autopilot does not allow mounting `/var/run/docker.sock`.
:::

## Remote Access with TLS (for self-managed Docker hosts)

  ```yaml
  server:
    ai-engines:
      ...
      params:
        host: 'your-docker-host'
        port: 2376
        protocol: 'https'
        ca: '/path/to/ca.pem'
        cert: '/path/to/cert.pem'
        key: '/path/to/key.pem'
  ```


## Local Development

For local development, you can still connect to Docker via the socket path.

### Windows

  ```yaml
  server:
    ai-engines:
      ...
      params:
        socketPath: '//./pipe/docker_engine'
  ```

### macOS/Linux

  ```yaml
  server:
    ai-engines:
      ...
      params:
        socketPath: '/var/run/docker.sock'
  ```


## Security Notes

* **Never use port 2375 (plain HTTP)** in production.
* Always use TLS (`2376`) for secure Docker remote API access.
* For cloud platforms (AKS, EKS, GKE), use native registry integrations instead of Docker sockets.
* Use managed identity / IAM roles / workload identity wherever possible.
