# Remote deploy

Jenkins **Deploy** stage copies `deploy/docker-compose.yaml` and `nginx.conf` to **DEPLOY_DIR**, exports **IMAGE_API** / **IMAGE_WEB**, then:

```bash
docker-compose -f <COMPOSE_FILE> pull
docker-compose -f <COMPOSE_FILE> up -d
```

## On the server

- Compose file at e.g. `/root/dev/frontend/docker-compose.yaml` (overwritten each deploy from this repo)
- `.env` for secrets (PGPASSWORD, SMTP_*, etc.) — not touched by Jenkins
- Images: `IMAGE_API` / `IMAGE_WEB` = `DOCKER_REPO_*:BUILD_NUMBER`

### `Get "http:": http: no Host in request URL`

Usually a bad image reference on the host, e.g. `DOCKER_REPO_API=http:` in `.env` or a compose `image:` line that prefixes a registry URL incorrectly. The Jenkins deploy now syncs `deploy/docker-compose.yaml` (uses `${IMAGE_API}` / `${IMAGE_WEB}` only) and validates refs before pull.

## Jenkins parameters

| Parameter | Default |
|-----------|---------|
| `DEPLOY_DIR` | `/root/dev/frontend` |
| `COMPOSE_FILE` | `docker-compose.yaml` |
| `DEPLOY_HOST` | `149.102.140.178` |
| `DEPLOY_USER` | `root` |

Optional reference: `deploy/docker-compose.prod.example.yml` (not copied by Jenkins).
