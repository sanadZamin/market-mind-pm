# Remote deploy

Jenkins **Deploy** stage SSHs to the host, exports image tags, and runs compose against **files already on the server** (nothing is copied from the repo).

```bash
docker compose --project-directory /root/dev/frontend \
  --env-file /root/dev/frontend/.env \
  -f /root/dev/frontend/docker-compose.yaml pull
docker compose ... up -d
```

## On the server

Maintain these in **DEPLOY_DIR** (default `/root/dev/frontend`):

| File | Purpose |
|------|---------|
| `docker-compose.yaml` | Your compose stack (image refs should use `${IMAGE_API}` / `${IMAGE_WEB}` or `${DOCKER_REPO_API}:${IMAGE_TAG}`) |
| `.env` | Secrets and config (`PGPASSWORD`, `PGHOST`, SMTP, etc.) |
| `nginx.conf` | If the nginx service mounts it |

Jenkins exports `IMAGE_API`, `IMAGE_WEB`, `IMAGE_TAG`, `DOCKER_REPO_API`, and `DOCKER_REPO_WEB` before `pull` / `up`.

- **Do not** set Jenkins `DEPLOY_DIR` to a Jenkins workspace path.
- Repo files under `deploy/` are **reference examples only** — edit the copies on the server.

## Jenkins parameters

| Parameter | Default |
|-----------|---------|
| `DEPLOY_DIR` | `/root/dev/frontend` |
| `COMPOSE_FILE` | `docker-compose.yaml` |
| `DEPLOY_HOST` | `149.102.140.178` |
| `DEPLOY_USER` | `root` |
