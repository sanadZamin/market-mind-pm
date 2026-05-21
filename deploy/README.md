# Remote deploy (Jenkins → `149.102.140.178`)

Jenkins SSHs to the host, `cd`s into **DEPLOY_DIR** (default `~/dev/frontend` → `/root/dev/frontend`), and runs `docker-compose -f docker-compose.yml pull/up` for **COMPOSE_SERVICES** (`springapi,web`).

## One-time setup on the deploy host

```bash
mkdir -p ~/dev/frontend
cd ~/dev/frontend
```

Copy from this repo (from your laptop or git clone on the server):

| Local (repo) | On server (`~/dev/frontend`) |
|--------------|------------------------------|
| `deploy/docker-compose.prod.example.yml` | `docker-compose.yml` |
| `nginx.conf` (only if you use the `nginx` service) | `nginx.conf` |

Create `.env` next to `docker-compose.yml` (compose reads it automatically):

```bash
cat > .env <<'EOF'
PGPASSWORD=your-postgres-password
PGHOST=hayyah-postgres
PGDATABASE=marketmind
PM_TOOL_BASE_URL=https://your-domain/pm
# IMAGE_TAG, DOCKER_REPO_* are set by Jenkins on each deploy
EOF
```

Ensure Postgres is reachable from the compose network (same Docker network as `hayyah-postgres`, or adjust `PGHOST`).

Verify before the next Jenkins run:

```bash
cd ~/dev/frontend
ls -la docker-compose.yml .env
docker-compose config   # should print merged config, no "Can't find configuration file"
```

## Jenkins parameters

| Parameter | Default |
|-----------|---------|
| `DEPLOY_DIR` | `~/dev/frontend` |
| `COMPOSE_FILE` | `docker-compose.yml` |
| `COMPOSE_SERVICES` | `springapi,web` |

If your compose file lives elsewhere or has another name, override `DEPLOY_DIR` / `COMPOSE_FILE` in the job.
