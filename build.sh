#!/bin/bash

# Usage: ./build.sh [local|staging|production]
ENV="$1"

if [ -z "$ENV" ]; then
  echo "Usage: $0 [local|staging|production] [up]"
  exit 1
fi

ENV_FILE=".env.$ENV"
COMPOSE_FILE="docker-compose.$ENV.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Environment file '$ENV_FILE' not found"
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ Compose file '$COMPOSE_FILE' not found"
  exit 1
fi

echo "✅ Using environment: $ENV"
echo "📄 Loading env from: $ENV_FILE"
echo "📦 Using compose file: $COMPOSE_FILE"

# Export environment variables
set -a
source "$ENV_FILE"
set +a

# 👇 Production: Build Vue and copy to nginx
if [ "$ENV" == "production" ]; then
  echo "🚧 Building frontend (Vue) for production..."

  # Build the frontend (from ./frontend) using your Dockerfile.production
  docker build -f frontend/Dockerfile.production -t frontend-builder ./frontend

  # Extract the build dist/ folder from the image
  docker create --name extract-temp frontend-builder
  docker cp extract-temp:/app/dist ./frontend-dist
  docker rm extract-temp

  echo "🚧 Building custom nginx image with frontend..."
  docker build -f Dockerfile.nginx -t dallascaley/custom-nginx:latest .
fi

# Build the Docker images
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache

if [ "$2" == "up" ]; then
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up
fi

