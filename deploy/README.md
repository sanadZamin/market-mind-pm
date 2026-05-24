# Remote deploy (Jenkins → deploy host)

Jenkins SSHs to **DEPLOY_DIR** (default `/root/dev/frontend`), finds your existing compose file, and runs `docker-compose pull/up` for **COMPOSE_SERVICES** (`springapi,web`).

## Compose file on the server

Use **your** `docker-compose.yml` or `docker-compose.yaml` in the deploy directory. Jenkins does **not** copy anything from this repo unless you choose to.

**COMPOSE_FILE** job parameter:

- **Empty (default)** — auto-detect, in order: `docker-compose.yaml`, `docker-compose.yml`, `compose.yaml`, `compose.yml`
- **Set explicitly** — e.g. `docker-compose.yaml` if you use a non-standard name

## Jenkins parameters

| Parameter | Default |
|-----------|---------|
| `DEPLOY_DIR` | `/root/dev/frontend` |
| `COMPOSE_FILE` | *(empty = auto-detect)* |
| `COMPOSE_SERVICES` | `springapi,web` |

Jenkins exports `IMAGE_TAG`, `DOCKER_REPO_API`, and `DOCKER_REPO_WEB` before pull/up — your compose file should reference those variables.

## Verify on the host

```bash
cd /root/dev/frontend   # or your DEPLOY_DIR
ls -la docker-compose.* compose.*
docker-compose -f docker-compose.yaml config   # use your actual filename
```

Optional reference only (not deployed by Jenkins): `deploy/docker-compose.prod.example.yml`.
