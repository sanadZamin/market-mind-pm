# Remote deploy

Jenkins **Deploy** stage copies `deploy/docker-compose.yaml` and `nginx.conf` to **DEPLOY_DIR**, exports **IMAGE_API** / **IMAGE_WEB**, then:

```bash
docker-compose -f <COMPOSE_FILE> pull
docker-compose -f <COMPOSE_FILE> up -d
```

## On the server

- Compose + `nginx.conf` at e.g. `/root/dev/frontend/` (synced each deploy from this repo)
- **`.env` in that same directory** (never overwritten by Jenkins) with secrets, e.g.:

```env
PGPASSWORD=your-postgres-password
SMTP_HOST=smtp.resend.com
SMTP_PASS=re_...
EMAIL_FROM=notifications@yourdomain.com
PM_TOOL_BASE_URL=https://market-mind.com/pm
```

- **Do not** set Jenkins `DEPLOY_DIR` to a Jenkins workspace path (`/var/jenkins_home/workspace/...`). Use the path on the deploy host, default `/root/dev/frontend`.

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
