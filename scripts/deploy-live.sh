#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${1:-$HOME/apps/BurnBounty}"
BRANCH="${2:-main}"
COMPOSE_FILE="deploy/traefik/docker-compose.existing-traefik.yml"
ENV_FILE="deploy/traefik/.env.live"

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "Repository not found at $REPO_DIR"
  exit 1
fi

cd "$REPO_DIR"

echo "[deploy-live] Fetching latest $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE"
  echo "Create it from .env.live.example before deploying"
  exit 1
fi

echo "[deploy-live] Building and starting live stack"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo "[deploy-live] Done"
