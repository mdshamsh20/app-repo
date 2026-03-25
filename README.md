# AI Task Platform

This repository contains the application code for the DevOps + MERN assignment:

- `frontend`: React + Vite UI
- `backend`: Express API with JWT auth, MongoDB persistence, Redis-backed queueing
- `worker`: Python background processor

## Features

- User registration and login with bcrypt password hashing and JWT auth
- Create text-processing tasks with asynchronous execution
- Task statuses: `pending`, `running`, `success`, `failed`
- Task logs, results, and error tracking
- Dockerfiles for each service and `docker-compose` for local startup
- CI workflow for lint, build, Docker image build/push, and infra tag update
- Kubernetes and Argo CD manifests in the sibling infra repository

## Assignment Coverage

- JWT authentication and `bcrypt` password hashing
- Create AI tasks with `title`, `inputText`, and `operation`
- Async task execution through Redis + Python worker
- Status tracking: `pending`, `running`, `success`, `failed`
- Task logs and results in the UI
- Separate Dockerfiles for frontend, backend, and worker
- Multi-stage builds and non-root containers
- `docker-compose` for local development
- Kubernetes-ready manifests with ConfigMap, Secret, Ingress, requests/limits, and probes
- Worker scaling support through multiple replicas and HPA manifest
- GitOps flow support through Argo CD application manifests and CI-driven image tag updates

## Local Development

1. Start the full stack:

```bash
docker compose up --build
```

2. Open the UI at `http://localhost:8080`
3. API health endpoint: `http://localhost:4000/health`
4. Register a user, create a task, and watch status/logs update

## Environment Variables

Copy `.env.example` values into your runtime environment or Kubernetes manifests.

## Task Operations

- `uppercase`
- `lowercase`
- `reverse`
- `word_count`

## Notes

- The backend writes a task document first with `pending` status, then pushes the job to Redis.
- The worker reads the Redis queue, marks the task `running`, computes the result, and stores logs plus final status.
- The infrastructure manifests live in the sibling `infra-repo` directory.

## CI/CD Secrets

To activate the GitHub Actions pipeline fully, configure these repository secrets:

- `REGISTRY_HOST`
- `REGISTRY_USERNAME`
- `REGISTRY_PASSWORD`
- `IMAGE_REGISTRY`
- `INFRA_REPOSITORY`
- `INFRA_REPO_TOKEN`

Example:

- `REGISTRY_HOST`: `docker.io`
- `IMAGE_REGISTRY`: `docker.io/your-dockerhub-username`
- `INFRA_REPOSITORY`: `your-org/infra-repo`

## Deliverables Still Requiring Real Infrastructure

These items cannot be generated only from local code and must be completed against a real cluster/repository setup:

- Argo CD installation on a Kubernetes cluster
- Actual Docker registry push using your registry credentials
- Real infra repository URL wiring
- Argo CD dashboard screenshot
- Live deployed URL
