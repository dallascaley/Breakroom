#!/bin/bash

# Usage: ./build.sh [local|staging|production]
ENV="$1"

if [ -z "$ENV" ]; then
  echo "Usage: $0 [local|staging|production]"
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

# Build the Docker images
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache

if [ "$2" == "up" ]; then
  docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up
fi

