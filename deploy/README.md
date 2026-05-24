# Remote deploy

Jenkins **Deploy** stage SSHs to the host, `cd`s into **DEPLOY_DIR**, exports **IMAGE_TAG** / **DOCKER_REPO_***, then:

```bash
docker-compose -f <COMPOSE_FILE> pull
docker-compose -f <COMPOSE_FILE> up -d
```

## On the server

- Compose file at e.g. `/root/dev/frontend/docker-compose.yaml`
- Images tagged with `${IMAGE_TAG}` (build number from Jenkins)
- `.env` for secrets (PGPASSWORD, etc.)

## Jenkins parameters

| Parameter | Default |
|-----------|---------|
| `DEPLOY_DIR` | `/root/dev/frontend` |
| `COMPOSE_FILE` | `docker-compose.yaml` |
| `DEPLOY_HOST` | `149.102.140.178` |
| `DEPLOY_USER` | `root` |

Optional reference: `deploy/docker-compose.prod.example.yml` (not copied by Jenkins).
