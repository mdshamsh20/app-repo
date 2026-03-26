# Architecture Document

## Overview

The platform consists of a React frontend, an Express API, MongoDB, Redis, and a Python worker. Users authenticate through the backend, create AI tasks, and the backend persists each task in MongoDB before pushing a job payload to Redis. The worker consumes jobs asynchronously, updates task status, appends logs, and writes the final result back to MongoDB.

## Worker Scaling Strategy

The worker is stateless, so horizontal scaling is straightforward. Each worker replica competes for messages from the Redis list, which distributes jobs across replicas. In Kubernetes, the worker `Deployment` can be scaled manually or through an HPA driven by CPU and memory. Since workers do not keep local state, replacement and rescheduling are safe.

## Handling 100k Tasks per Day

100k tasks per day is roughly 1.16 tasks per second on average, with higher burst rates expected. To support that load:

- Keep API nodes stateless and scale them behind a Kubernetes `Service`.
- Scale worker replicas independently from the API tier.
- Use Redis only for short-lived queue buffering, not long-term storage.
- Index MongoDB by `userId`, `status`, and `createdAt` to keep task lookups fast.
- Use resource requests and limits so noisy services do not starve the queue processor.
- Add monitoring around queue depth, task latency, API latency, and MongoDB saturation.

## Database Indexing Strategy

The `tasks` collection uses compound indexes on `(userId, createdAt)` for user dashboards and `(status, createdAt)` for operational queries. The `users` collection keeps a unique index on `email`. This keeps login and task listing queries efficient while preserving data integrity.

## Redis Failure Handling

If Redis is unavailable when the backend tries to enqueue a task, the API marks the task as `failed` and returns `503`, which avoids silent data loss. In production, Redis should run with persistence enabled, replicas or sentinel depending on environment size, and monitoring for memory pressure. Retry or dead-letter behavior can be added by switching to a richer queue abstraction if needed.

## Staging and Production Environments

The separate infrastructure repository contains `staging` and `production` overlays. Each overlay references a different namespace, hostname, image tags, and secrets. CI updates the image tag in the target overlay, and Argo CD auto-syncs that change into the correct cluster namespace. This keeps application code and deployment state decoupled.

## GitOps Automation

The application repository workflow builds and optionally pushes container images for frontend, backend, and worker. On `main`, the workflow can also clone the infrastructure repository, update the staging image tags in the Kustomize overlay, commit that change, and push it back. Argo CD then detects the overlay change and syncs the cluster automatically.
