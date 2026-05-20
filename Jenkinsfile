/**
 * Market Mind PM — build image(s), push to Docker Hub, deploy on remote host.
 *
 * Jenkins credentials (Manage Jenkins → Credentials → System → Global):
 *   - dockerhub-deploy   (Username with password) — Docker Hub user + access token (Read & Write)
 *
 * Deploy SSH: private key mounted in Jenkins (default /var/jenkins_home/.ssh/id_deploy).
 *
 * Jenkins container needs a recent Docker CLI (API ≥ 1.44 for Docker Engine 29+) plus the
 * host socket. See deploy/jenkins-docker-compose.example.yml.
 *
 * On the deploy host, production compose must pull by tag, e.g.:
 *   image: altshiftcreative/marketmind-springapi:${IMAGE_TAG}
 * (IMAGE_TAG and DOCKER_REPO_* are exported in the Deploy stage before pull/up)
 *
 * Copy deploy/docker-compose.prod.example.yml to your server as docker-compose.yml and adjust.
 */
pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timeout(time: 60, unit: 'MINUTES')
        timestamps()
    }

    parameters {
        string(name: 'DOCKER_REPO_API', defaultValue: 'altshiftcreative/marketmind-springapi', description: 'Docker Hub image for Spring API (user/name, no tag)')
        string(name: 'DOCKER_REPO_WEB', defaultValue: 'altshiftcreative/marketmind-web', description: 'Docker Hub image for SPA/nginx (user/name, no tag)')
        booleanParam(name: 'BUILD_WEB', defaultValue: true, description: 'Also build and push the web (Dockerfile.web) image')
        booleanParam(name: 'PUSH_LATEST', defaultValue: true, description: 'Also tag and push :latest on each built image')
        string(name: 'VITE_PM_BASE_PATH', defaultValue: '/pm', description: 'SPA base path baked into web build (Dockerfile.web BASE_PATH)')
        string(name: 'DEPLOY_HOST', defaultValue: 'http://149.102.140.178:88/', description: 'Deploy target host (use 172.17.0.1 if Jenkins runs on same machine in Docker)')
        string(name: 'DEPLOY_USER', defaultValue: 'root', description: 'SSH user on deploy host')
        string(name: 'DEPLOY_DIR', defaultValue: '/root/dev/market-mind-pm', description: 'Directory on host containing production docker-compose.yml')
        string(name: 'COMPOSE_SERVICES', defaultValue: 'springapi web', description: 'Space-separated compose service names to pull/restart (e.g. springapi or springapi web nginx)')
        string(name: 'DEPLOY_SSH_KEY', defaultValue: '/var/jenkins_home/.ssh/id_deploy', description: 'Path to deploy private key inside Jenkins container')
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
        DEPLOY_HOST = "${params.DEPLOY_HOST}"
        DEPLOY_USER = "${params.DEPLOY_USER}"
        DEPLOY_DIR = "${params.DEPLOY_DIR}"
        COMPOSE_SERVICES = "${params.COMPOSE_SERVICES}"
        DEPLOY_SSH_KEY = "${params.DEPLOY_SSH_KEY}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
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
                        command -v docker >/dev/null || {
                          echo "ERROR: docker not in PATH. Mount host Docker CLI + socket into Jenkins (see deploy/jenkins-docker-compose.example.yml)."
                          exit 127
                        }
                        docker version
                        docker buildx version
                        docker buildx inspect --bootstrap >/dev/null 2>&1 || docker buildx create --use --name jenkins-builder

                        echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USER" --password-stdin

                        api_tags="-t ${IMAGE_API}"
                        if [ "${PUSH_LATEST}" = "true" ]; then
                          api_tags="$api_tags -t ${DOCKER_REPO_API}:latest"
                        fi

                        echo "Building API → ${IMAGE_API}"
                        docker buildx build \
                          --platform linux/amd64 \
                          $api_tags \
                          -f Dockerfile.springboot.api \
                          --push \
                          .

                        if [ "${BUILD_WEB}" = "true" ]; then
                          web_tags="-t ${IMAGE_WEB}"
                          if [ "${PUSH_LATEST}" = "true" ]; then
                            web_tags="$web_tags -t ${DOCKER_REPO_WEB}:latest"
                          fi
                          echo "Building web → ${IMAGE_WEB} (BASE_PATH=${VITE_PM_BASE_PATH})"
                          docker buildx build \
                            --platform linux/amd64 \
                            $web_tags \
                            -f Dockerfile.web \
                            --build-arg VITE_PM_SIGNIN_PATH=login \
                            --build-arg BASE_PATH="${VITE_PM_BASE_PATH}" \
                            --push \
                            .
                        fi

                        echo "Push complete."
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''#!/usr/bin/env bash
                    set -euo pipefail
                    if [ ! -f "${DEPLOY_SSH_KEY}" ]; then
                      echo "ERROR: SSH key not found at ${DEPLOY_SSH_KEY} (mount host key in Jenkins compose)."
                      exit 1
                    fi
                    SSH_KEY="$(mktemp)"
                    trap 'rm -f "${SSH_KEY}"' EXIT
                    cp "${DEPLOY_SSH_KEY}" "${SSH_KEY}"
                    chmod 600 "${SSH_KEY}"
                    ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no -o BatchMode=yes \
                      "${DEPLOY_USER}@${DEPLOY_HOST}" \
                      "bash -lc 'set -euo pipefail
                       cd \"${DEPLOY_DIR}\"
                       export IMAGE_TAG=\"${IMAGE_TAG}\"
                       export DOCKER_REPO_API=\"${DOCKER_REPO_API}\"
                       export DOCKER_REPO_WEB=\"${DOCKER_REPO_WEB}\"
                       for svc in ${COMPOSE_SERVICES}; do
                         docker compose pull \"\$svc\"
                         docker compose up -d --no-deps \"\$svc\"
                       done
                       docker compose ps ${COMPOSE_SERVICES}'"
                '''
            }
        }
    }

    post {
        success {
            echo "Deployed API ${IMAGE_API} to ${DEPLOY_HOST}:${DEPLOY_DIR}${BUILD_WEB == 'true' ? ' (web ' + IMAGE_WEB + ')' : ''}"
        }
        failure {
            echo 'Build or deploy failed — check: Docker CLI API ≥1.44, dockerhub-deploy credential, SSH key mount, authorized_keys, compose path, IMAGE_TAG in compose.'
        }
    }
}
