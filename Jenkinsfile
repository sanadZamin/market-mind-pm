/**
 * Market Mind PM — build image(s), push to Docker Hub, deploy on remote host.
 *
 * Jenkins credentials (Manage Jenkins → Credentials → System → Global):
 *   - dockerhub-deploy   (Username with password) — Docker Hub user + access token (Read & Write)
 *
 * Deploy SSH (pick one):
 *   A) Jenkins credential "SSH Username with private key" — set DEPLOY_SSH_CREDENTIALS_ID (default deploy-ssh-key)
 *   B) Private key file mounted in Jenkins — set DEPLOY_SSH_CREDENTIALS_ID empty, use DEPLOY_SSH_KEY path
 *
 * On deploy host, the matching *public* key must be in ~/.ssh/authorized_keys for DEPLOY_USER.
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
        string(name: 'DEPLOY_HOST', defaultValue: '149.102.140.178', description: 'Deploy target host (use 172.17.0.1 if Jenkins runs on same machine in Docker)')
        string(name: 'DEPLOY_USER', defaultValue: 'root', description: 'SSH user on deploy host')
        string(name: 'DEPLOY_DIR', defaultValue: '/root/dev/frontend', description: 'Directory on deploy host with production docker-compose.yml (e.g. ~/dev/frontend for root)')
        string(name: 'COMPOSE_FILE', defaultValue: '', description: 'Compose file in DEPLOY_DIR (e.g. docker-compose.yaml). Leave empty to auto-detect.')
        string(name: 'COMPOSE_SERVICES', defaultValue: 'springapi,web', description: 'Compose services to pull/restart — comma-separated (springapi,web) or space-separated (springapi web)')
        string(name: 'DEPLOY_SSH_CREDENTIALS_ID', defaultValue: '', description: 'Jenkins SSH credential ID (SSH Username with private key). Leave empty to use mounted DEPLOY_SSH_KEY file (see deploy/jenkins-docker-compose.example.yml).')
        string(name: 'DEPLOY_SSH_KEY', defaultValue: '/var/jenkins_home/.ssh/id_deploy', description: 'Deploy private key path (only if DEPLOY_SSH_CREDENTIALS_ID is empty)')
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
        DEPLOY_DIR = "${params.DEPLOY_DIR?.trim() ?: '~/dev/frontend'}"
        COMPOSE_FILE = "${params.COMPOSE_FILE?.trim() ?: ''}"
        COMPOSE_SERVICES = "${params.COMPOSE_SERVICES?.trim() ?: 'springapi,web'}"
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
                script {
                    // Resolve deploy settings in Groovy — ${DEPLOY_DIR} inside `def deployBody = { sh ''' }`
                    // is not substituted by Jenkins and arrives empty on the remote host.
                    def deployUser = (params.DEPLOY_USER ?: 'root').trim()
                    def deployHost = (params.DEPLOY_HOST ?: '149.102.140.178').trim()
                    def deployDir = (params.DEPLOY_DIR ?: '').trim()
                    if (!deployDir) {
                        deployDir = '/root/dev/frontend'
                    }
                    def composeFile = (params.COMPOSE_FILE ?: '').trim()
                    def composeServices = (params.COMPOSE_SERVICES ?: 'springapi,web').trim()
                    def imageTag = env.BUILD_NUMBER
                    def dockerRepoApi = params.DOCKER_REPO_API
                    def dockerRepoWeb = params.DOCKER_REPO_WEB
                    def deploySshKey = (params.DEPLOY_SSH_KEY ?: '/var/jenkins_home/.ssh/id_deploy').trim()
                    def shellQ = { String v -> "'" + v.replace("'", "'\\''") + "'" }
                    def composeHint = composeFile ?: '(auto-detect)'
                    echo "Deploy target: ${deployUser}@${deployHost} dir=${deployDir} compose=${composeHint} services=${composeServices} tag=${imageTag}"

                    def deployBody = {
                        sh """#!/usr/bin/env bash
set -eo pipefail

print_deploy_pubkey() {
  echo "----- Add ONE of these lines to ${deployUser}@${deployHost} ~/.ssh/authorized_keys -----"
  if [ -n "\${SSH_AUTH_SOCK:-}" ]; then
    ssh-add -L 2>/dev/null || true
  elif [ -n "\${SSH_KEY_FILE:-}" ] && [ -f "\${SSH_KEY_FILE}" ]; then
    ssh-keygen -y -f "\${SSH_KEY_FILE}" 2>/dev/null || true
  fi
  echo "----- end -----"
}

SSH_CMD=(ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=15)
SSH_KEY_FILE=""
if [ -n "\${SSH_AUTH_SOCK:-}" ] && ssh-add -l >/dev/null 2>&1; then
  echo "SSH auth: Jenkins ssh-agent (credential)"
  ssh-add -l || true
elif [ -f ${shellQ(deploySshKey)} ]; then
  if [ -d ${shellQ(deploySshKey)} ]; then
    echo "ERROR: ${deploySshKey} is a directory. Mount the private key FILE:"
    echo "  /root/jenkins-deploy:/var/jenkins_home/.ssh/id_deploy:ro"
    exit 1
  fi
  SSH_KEY_FILE=${shellQ(deploySshKey)}
  echo "SSH auth: key file \${SSH_KEY_FILE}"
  head -1 "\${SSH_KEY_FILE}" | grep -qE 'PRIVATE KEY' || {
    echo "ERROR: \${SSH_KEY_FILE} does not look like an OpenSSH private key."
    exit 1
  }
  chmod 600 "\${SSH_KEY_FILE}" 2>/dev/null || true
  SSH_KEY="\$(mktemp)"
  trap 'rm -f "\${SSH_KEY}"' EXIT
  cp "\${SSH_KEY_FILE}" "\${SSH_KEY}"
  chmod 600 "\${SSH_KEY}"
  SSH_CMD+=(-i "\${SSH_KEY}")
  echo "Key fingerprint:"
  ssh-keygen -lf "\${SSH_KEY}" || true
  echo "Public key for authorized_keys:"
  ssh-keygen -y -f "\${SSH_KEY}" || true
else
  echo "ERROR: No ssh-agent key and no file at ${deploySshKey}"
  echo "Mount host key: /root/jenkins-deploy:/var/jenkins_home/.ssh/id_deploy:ro"
  echo "Or set Jenkins credential DEPLOY_SSH_CREDENTIALS_ID (e.g. deploy-ssh-key)."
  exit 1
fi

echo "Preflight: ${deployUser}@${deployHost}"
if ! "\${SSH_CMD[@]}" "${deployUser}@${deployHost}" echo "SSH OK"; then
  echo ""
  echo "ERROR: Permission denied (publickey)."
  print_deploy_pubkey
  echo ""
  echo "On deploy host (as root), run:"
  echo "  mkdir -p ~/.ssh && chmod 700 ~/.ssh"
  echo "  echo '<paste public key line above>' >> ~/.ssh/authorized_keys"
  echo "  chmod 600 ~/.ssh/authorized_keys"
  echo ""
  echo "Verify from Jenkins container:"
  echo "  docker exec -it jenkins_sandbox ssh -i ${deploySshKey} -o BatchMode=yes ${deployUser}@${deployHost} echo OK"
  exit 255
fi

"\${SSH_CMD[@]}" "${deployUser}@${deployHost}" bash -s <<REMOTE_EOF
set -eo pipefail
export DEPLOY_DIR=${shellQ(deployDir)}
export IMAGE_TAG=${shellQ(imageTag)}
export DOCKER_REPO_API=${shellQ(dockerRepoApi)}
export DOCKER_REPO_WEB=${shellQ(dockerRepoWeb)}
export COMPOSE_SERVICES=${shellQ(composeServices)}
export COMPOSE_FILE=${shellQ(composeFile)}
_deploy_dir=\$(printf '%s' "\$DEPLOY_DIR" | sed "s|^~/|\$HOME/|")
[ "\$_deploy_dir" = "~" ] && _deploy_dir="\$HOME"
echo "Deploy dir: \$_deploy_dir"
if [ ! -d "\$_deploy_dir" ]; then
  echo "ERROR: deploy directory does not exist: \$_deploy_dir"
  exit 1
fi
cd "\$_deploy_dir"
compose_file="\$COMPOSE_FILE"
if [ -n "\$compose_file" ] && [ ! -f "\$compose_file" ]; then
  echo "ERROR: COMPOSE_FILE not found: \$_deploy_dir/\$compose_file"
  ls -la "\$_deploy_dir" || true
  exit 1
fi
if [ -z "\$compose_file" ]; then
  for candidate in docker-compose.yaml docker-compose.yml compose.yaml compose.yml; do
    if [ -f "\$candidate" ]; then
      compose_file="\$candidate"
      break
    fi
  done
fi
if [ -z "\$compose_file" ] || [ ! -f "\$compose_file" ]; then
  echo "ERROR: no compose file in \$_deploy_dir"
  echo "Add docker-compose.yml or set Jenkins parameter COMPOSE_FILE to your filename."
  ls -la "\$_deploy_dir" || true
  exit 1
fi
echo "Using compose file: \$_deploy_dir/\$compose_file"
for svc in \$(echo "\$COMPOSE_SERVICES" | tr ',' ' '); do
  svc=\$(echo "\$svc" | xargs)
  [ -z "\$svc" ] && continue
  echo "Deploying service: \$svc"
  docker-compose -f "\$compose_file" pull "\$svc"
  docker-compose -f "\$compose_file" up -d --no-deps "\$svc"
done
docker-compose -f "\$compose_file" ps \$(echo "\$COMPOSE_SERVICES" | tr ',' ' ')
REMOTE_EOF
"""
                    }
                    def credId = params.DEPLOY_SSH_CREDENTIALS_ID?.trim()
                    if (credId) {
                        sshagent(credentials: [credId]) {
                            deployBody()
                        }
                    } else {
                        deployBody()
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Deployed API ${IMAGE_API} to ${DEPLOY_HOST}:${DEPLOY_DIR}${BUILD_WEB == 'true' ? ' (web ' + IMAGE_WEB + ')' : ''}"
        }
        failure {
            echo 'Build or deploy failed — check: Docker CLI API ≥1.44, dockerhub-deploy, SSH key, DEPLOY_DIR + docker-compose.yml on host (deploy/README.md), IMAGE_TAG in compose.'
        }
    }
}
