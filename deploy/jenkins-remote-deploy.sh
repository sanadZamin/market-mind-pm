#!/usr/bin/env bash
# Run on deploy host via: ssh user@host bash -s -- DEPLOY_DIR IMAGE_TAG DOCKER_REPO_API DOCKER_REPO_WEB COMPOSE_SERVICES COMPOSE_FILE < jenkins-remote-deploy.sh
set -eo pipefail

DEPLOY_DIR=$1
IMAGE_TAG=$2
DOCKER_REPO_API=$3
DOCKER_REPO_WEB=$4
COMPOSE_SERVICES=$5
COMPOSE_FILE=$6
shift 6

export DEPLOY_DIR IMAGE_TAG DOCKER_REPO_API DOCKER_REPO_WEB COMPOSE_SERVICES COMPOSE_FILE

_deploy_dir=$(printf '%s' "$DEPLOY_DIR" | sed "s|^~/|$HOME/|")
[ "$_deploy_dir" = "~" ] && _deploy_dir="$HOME"
echo "Deploy dir: $_deploy_dir"

if [ ! -d "$_deploy_dir" ]; then
  echo "ERROR: deploy directory does not exist: $_deploy_dir"
  exit 1
fi

cd "$_deploy_dir"
compose_file="$COMPOSE_FILE"

if [ -n "$compose_file" ] && [ ! -f "$compose_file" ]; then
  echo "ERROR: COMPOSE_FILE not found: $_deploy_dir/$compose_file"
  ls -la "$_deploy_dir" || true
  exit 1
fi

if [ -z "$compose_file" ]; then
  for candidate in docker-compose.yaml docker-compose.yml compose.yaml compose.yml; do
    if [ -f "$candidate" ]; then
      compose_file="$candidate"
      break
    fi
  done
fi

if [ -z "$compose_file" ] || [ ! -f "$compose_file" ]; then
  echo "ERROR: no compose file in $_deploy_dir"
  ls -la "$_deploy_dir" || true
  exit 1
fi

echo "Using compose file: $_deploy_dir/$compose_file"

for svc in $(echo "$COMPOSE_SERVICES" | tr ',' ' '); do
  svc=$(echo "$svc" | xargs)
  [ -z "$svc" ] && continue
  echo "Deploying service: $svc"
  docker-compose -f "$compose_file" pull "$svc"
  docker-compose -f "$compose_file" up -d --no-deps "$svc"
done

docker-compose -f "$compose_file" ps $(echo "$COMPOSE_SERVICES" | tr ',' ' ')
