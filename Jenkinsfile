/**
 * Market Mind PM — build & push images, then SSH deploy on remote host.
 *
 * Credentials: dockerhub-deploy (Docker Hub)
 * Deploy key: mount /var/jenkins_home/.ssh/id_deploy or set DEPLOY_SSH_CREDENTIALS_ID
 *
 * Server: compose + .env + nginx.conf live in DEPLOY_DIR on the host (Jenkins does not copy files).
 */
pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timeout(time: 60, unit: 'MINUTES')
        timestamps()
        
    }

    parameters {
        string(name: 'DOCKER_REPO_API', defaultValue: 'altshiftcreative/marketmind-springapi', description: 'Docker Hub image (no tag)')
        string(name: 'DOCKER_REPO_WEB', defaultValue: 'altshiftcreative/marketmind-web', description: 'Docker Hub web image (no tag)')
        booleanParam(name: 'BUILD_WEB', defaultValue: true, description: 'Build and push web image')
        booleanParam(name: 'PUSH_LATEST', defaultValue: true, description: 'Also push :latest')
        string(name: 'VITE_PM_BASE_PATH', defaultValue: '/pm', description: 'Web build BASE_PATH')
        booleanParam(name: 'VITE_MARKETING_MAINTENANCE', defaultValue: true, description: 'Show maintenance screen on marketing routes')
        string(name: 'DEPLOY_HOST', defaultValue: '149.102.140.178', description: 'Deploy host')
        string(name: 'DEPLOY_USER', defaultValue: 'root', description: 'SSH user')
        string(name: 'DEPLOY_DIR', defaultValue: '/root/dev/frontend', description: 'Directory with docker-compose on host')
        string(name: 'COMPOSE_FILE', defaultValue: 'docker-compose.yaml', description: 'Compose filename in DEPLOY_DIR')
        string(name: 'DEPLOY_SSH_CREDENTIALS_ID', defaultValue: '', description: 'Optional Jenkins SSH credential ID')
        string(name: 'DEPLOY_SSH_KEY', defaultValue: '/var/jenkins_home/.ssh/id_deploy', description: 'SSH private key file (if no credential ID)')
    }

    environment {
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        DOCKER_REPO_API = "${params.DOCKER_REPO_API}"
        DOCKER_REPO_WEB = "${params.DOCKER_REPO_WEB}"
        IMAGE_API = "${params.DOCKER_REPO_API}:${IMAGE_TAG}"
        IMAGE_WEB = "${params.DOCKER_REPO_WEB}:${IMAGE_TAG}"
        BUILD_WEB = "${params.BUILD_WEB}"
        PUSH_LATEST = "${params.PUSH_LATEST}"
        VITE_PM_BASE_PATH = "${params.VITE_PM_BASE_PATH}"
        VITE_MARKETING_MAINTENANCE = "${params.VITE_MARKETING_MAINTENANCE}"
        DEPLOY_HOST = "${params.DEPLOY_HOST}"
        DEPLOY_USER = "${params.DEPLOY_USER}"
        DEPLOY_DIR = "${params.DEPLOY_DIR?.trim() ?: '/root/dev/frontend'}"
        COMPOSE_FILE = "${params.COMPOSE_FILE?.trim() ?: 'docker-compose.yaml'}"
        DEPLOY_SSH_KEY = "${params.DEPLOY_SSH_KEY}"
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Build & Push') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-deploy',
                    usernameVariable: 'DOCKERHUB_USER',
                    passwordVariable: 'DOCKERHUB_TOKEN'
                )]) {
                    sh '''#!/usr/bin/env bash
set -euo pipefail
command -v docker >/dev/null || { echo "ERROR: docker not in PATH"; exit 127; }
echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USER" --password-stdin
docker buildx inspect --bootstrap >/dev/null 2>&1 || docker buildx create --use --name jenkins-builder

api_tags="-t ${IMAGE_API}"
[ "${PUSH_LATEST}" = "true" ] && api_tags="$api_tags -t ${DOCKER_REPO_API}:latest"
echo "Building API → ${IMAGE_API}"
docker buildx build --platform linux/amd64 $api_tags -f Dockerfile.springboot.api --push .

if [ "${BUILD_WEB}" = "true" ]; then
  web_tags="-t ${IMAGE_WEB}"
  [ "${PUSH_LATEST}" = "true" ] && web_tags="$web_tags -t ${DOCKER_REPO_WEB}:latest"
  echo "Building web → ${IMAGE_WEB}"
  docker buildx build --platform linux/amd64 $web_tags -f Dockerfile.web \
    --build-arg VITE_PM_SIGNIN_PATH=login --build-arg BASE_PATH="${VITE_PM_BASE_PATH}" \
    --build-arg VITE_MARKETING_MAINTENANCE="${VITE_MARKETING_MAINTENANCE}" --push .
fi
echo "Push complete."
'''
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    def credId = params.DEPLOY_SSH_CREDENTIALS_ID?.trim()
                    def run = {
                        sh '''#!/usr/bin/env bash
set -euo pipefail

SSH=(ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=15)
if [ -n "${SSH_AUTH_SOCK:-}" ] && ssh-add -l >/dev/null 2>&1; then
  echo "SSH: using agent"
elif [ -f "${DEPLOY_SSH_KEY}" ]; then
  echo "SSH: using key ${DEPLOY_SSH_KEY}"
  SSH+=(-i "${DEPLOY_SSH_KEY}")
else
  echo "ERROR: no SSH key at ${DEPLOY_SSH_KEY} and no ssh-agent key"
  exit 1
fi

if [ -z "${DOCKER_REPO_API// /}" ] || [ -z "${DOCKER_REPO_WEB// /}" ] || [ -z "${IMAGE_TAG// /}" ]; then
  echo "ERROR: DOCKER_REPO_API, DOCKER_REPO_WEB, and IMAGE_TAG must be non-empty"
  echo "  DOCKER_REPO_API=${DOCKER_REPO_API:-<empty>}"
  echo "  DOCKER_REPO_WEB=${DOCKER_REPO_WEB:-<empty>}"
  echo "  IMAGE_TAG=${IMAGE_TAG:-<empty>}"
  exit 1
fi

case "${DOCKER_REPO_API}:${IMAGE_TAG}" in
  http:*|https:*|:*|*":")
    echo "ERROR: invalid IMAGE_API ref: ${DOCKER_REPO_API}:${IMAGE_TAG}"
    exit 1
    ;;
esac
case "${DOCKER_REPO_WEB}:${IMAGE_TAG}" in
  http:*|https:*|:*|*":")
    echo "ERROR: invalid IMAGE_WEB ref: ${DOCKER_REPO_WEB}:${IMAGE_TAG}"
    exit 1
    ;;
esac

TARGET="${DEPLOY_USER}@${DEPLOY_HOST}"
echo "Deploy → ${TARGET}:${DEPLOY_DIR} (IMAGE_API=${IMAGE_API} IMAGE_WEB=${IMAGE_WEB})"

if [[ "${DEPLOY_DIR}" == *jenkins_home* ]] || [[ "${DEPLOY_DIR}" == *workspace* ]]; then
  echo "ERROR: DEPLOY_DIR=${DEPLOY_DIR} looks like a Jenkins workspace."
  echo "       Set Jenkins parameter DEPLOY_DIR to the server path, e.g. /root/dev/frontend"
  exit 1
fi

"${SSH[@]}" "$TARGET" \
  DEPLOY_DIR="${DEPLOY_DIR}" \
  COMPOSE_FILE="${COMPOSE_FILE}" \
  IMAGE_TAG="${IMAGE_TAG}" \
  DOCKER_REPO_API="${DOCKER_REPO_API}" \
  DOCKER_REPO_WEB="${DOCKER_REPO_WEB}" \
  IMAGE_API="${IMAGE_API}" \
  IMAGE_WEB="${IMAGE_WEB}" \
  bash -s <<'REMOTE_EOF'
set -euo pipefail
COMPOSE_PATH="${DEPLOY_DIR}/${COMPOSE_FILE}"
ENV_PATH="${DEPLOY_DIR}/.env"

if [ ! -f "${COMPOSE_PATH}" ]; then
  echo "ERROR: compose file not found at ${COMPOSE_PATH}"
  exit 1
fi

compose() {
  local env_args=()
  if [ -f "${ENV_PATH}" ]; then
    env_args=(--env-file "${ENV_PATH}")
  fi
  if docker compose version >/dev/null 2>&1; then
    docker compose --project-directory "${DEPLOY_DIR}" "${env_args[@]}" -f "${COMPOSE_PATH}" "$@"
  elif docker-compose --project-directory "${DEPLOY_DIR}" version >/dev/null 2>&1; then
    docker-compose --project-directory "${DEPLOY_DIR}" "${env_args[@]}" -f "${COMPOSE_PATH}" "$@"
  else
    docker-compose "${env_args[@]}" -f "${COMPOSE_PATH}" "$@"
  fi
}

echo "On host: DEPLOY_DIR=${DEPLOY_DIR}"
echo "  COMPOSE_PATH=${COMPOSE_PATH}"
if [ -f "${ENV_PATH}" ]; then
  echo "  ENV_PATH=${ENV_PATH} (found)"
else
  echo "  ENV_PATH=${ENV_PATH} (not found — compose + shell env only)"
fi
echo "  IMAGE_API=${IMAGE_API}"
echo "  IMAGE_WEB=${IMAGE_WEB}"

compose config >/dev/null
compose pull
if ! compose up -d; then
  echo "=== deploy failed — springapi logs (last 150 lines) ==="
  compose logs --tail=150 springapi || true
  cid=$(compose ps -q springapi 2>/dev/null || true)
  if [ -n "$cid" ]; then
    docker inspect "$cid" --format 'State={{.State.Status}} Health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}'
    docker inspect "$cid" --format '{{range .State.Health.Log}}  {{.ExitCode}} {{.Output}}{{println}}{{end}}' 2>/dev/null || true
  fi
  exit 1
fi
compose ps
REMOTE_EOF
'''
                    }
                    if (credId) {
                        sshagent(credentials: [credId]) { run() }
                    } else {
                        run()
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Deployed ${IMAGE_API} to ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_DIR}"
        }
        failure {
            echo 'Failed — check dockerhub-deploy, SSH key on host, DEPLOY_DIR, and compose file.'
        }
    }
}
