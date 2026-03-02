#!/usr/bin/env bash
set -euo pipefail

NETWORK_NAME="${CONTENTO_SHARED_DB_NET:-shared_db_net}"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[contento] Missing dependency: $cmd" >&2
    exit 1
  fi
}

require_docker_compose() {
  # Prefer plugin-style compose: `docker compose`
  if docker compose version >/dev/null 2>&1; then
    return 0
  fi
  echo "[contento] Missing dependency: docker compose" >&2
  echo "[contento] Install Docker Desktop (macOS/Windows) or Docker Engine + Compose plugin (Linux)." >&2
  exit 1
}

require_cmd docker
require_docker_compose

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

ensure_network() {
  if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    echo "[contento] Creating docker network: $NETWORK_NAME"
    docker network create "$NETWORK_NAME" >/dev/null
  fi
}

usage() {
  cat <<EOF
Usage: ./start.sh [--local|--external]

Modes:
  --local     Start an isolated stack (includes local Postgres via compose profile).
  --external  Start stack using external Postgres (requires DATABASE_URL).

Defaults:
  - If DATABASE_URL is set: --external
  - Otherwise: --local

Environment:
  CONTENTO_SHARED_DB_NET   Name of the external docker network to create/use (default: shared_db_net)
EOF
}

MODE=""
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ "${1:-}" == "--local" ]]; then
  MODE="local"
elif [[ "${1:-}" == "--external" ]]; then
  MODE="external"
elif [[ -n "${1:-}" ]]; then
  echo "Unknown argument: ${1}"
  usage
  exit 1
fi

ensure_network

AUTHENTIK_CONFIGURED=0
if [[ -n "${AUTHENTIK_ISSUER:-}" && -n "${AUTHENTIK_CLIENT_ID:-}" && -n "${AUTHENTIK_CLIENT_SECRET:-}" ]]; then
  AUTHENTIK_CONFIGURED=1
fi

if [[ "$AUTHENTIK_CONFIGURED" -eq 0 ]]; then
  export DEV_AUTH="${DEV_AUTH:-1}"
  export DEV_AUTH_USERNAME="${DEV_AUTH_USERNAME:-admin}"
  export DEV_AUTH_PASSWORD="${DEV_AUTH_PASSWORD:-admin}"
  export DEV_AUTH_SECRET="${DEV_AUTH_SECRET:-dev-auth-secret}"

  echo "[contento] Authentik is not configured; enabling dev auth fallback."
  echo "[contento] Dev admin credentials:"
  echo "[contento]   username: $DEV_AUTH_USERNAME"
  echo "[contento]   password: $DEV_AUTH_PASSWORD"
fi

if [[ -z "${NEXTAUTH_SECRET:-}" ]]; then
  export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-changeme_nextauth_secret_32chars}"
  echo "[contento] NEXTAUTH_SECRET is not set; using a default value (development only)."
fi

if [[ -z "$MODE" ]]; then
  if [[ -n "${DATABASE_URL:-}" ]]; then
    MODE="external"
  else
    MODE="local"
  fi
fi

if [[ "$MODE" == "external" ]]; then
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "[contento] DATABASE_URL is required for --external mode."
    exit 1
  fi

  echo "[contento] Starting stack (external Postgres)"
  docker compose up -d
  exit 0
fi

echo "[contento] Starting stack (local Postgres)"
docker compose --profile local up -d
