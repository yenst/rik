# Docker Setup

## Overview

Everything runs via `docker compose up`. No cloud accounts, no external services required.

## docker-compose.yml

```yaml
services:
  # ── Rik App ─────────────────────────────────────────
  rik-app:
    build:
      context: ./app
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - rik-data:/data
    environment:
      - DATABASE_PATH=/data/rik.db
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - MINIO_ENDPOINT=http://minio:9000
      - MINIO_ROOT_USER=rik
      - MINIO_ROOT_PASSWORD=riksecret
      - LLM_BASE_URL=http://ollama:11434/v1
      - LLM_API_KEY=ollama
      - LLM_MODEL=llama3.1:8b
    depends_on:
      - redis
      - minio
      - ollama

  # ── Background Worker ───────────────────────────────
  rik-worker:
    build:
      context: ./app
      dockerfile: worker/Dockerfile
    volumes:
      - rik-data:/data
    environment:
      - DATABASE_PATH=/data/rik.db
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - MINIO_ENDPOINT=http://minio:9000
      - MINIO_ROOT_USER=rik
      - MINIO_ROOT_PASSWORD=riksecret
      - LLM_BASE_URL=http://ollama:11434/v1
      - LLM_API_KEY=ollama
      - LLM_MODEL=llama3.1:8b
    depends_on:
      - redis
      - minio
      - ollama

  # ── Redis ───────────────────────────────────────────
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  # ── MinIO (S3-compatible storage) ───────────────────
  minio:
    image: minio/minio
    ports:
      - "9000:9000"   # API
      - "9001:9001"   # Console
    volumes:
      - minio-data:/data
    environment:
      - MINIO_ROOT_USER=rik
      - MINIO_ROOT_PASSWORD=riksecret
    command: server /data --console-address ":9001"

  # ── Stalwart Mail Server ────────────────────────────
  stalwart:
    image: stalwartlabs/mail-server:latest
    ports:
      - "25:25"       # SMTP
      - "993:993"     # IMAP
    volumes:
      - stalwart-data:/opt/stalwart-mail
      - ./config/stalwart.toml:/opt/stalwart-mail/etc/config.toml:ro

  # ── Ollama (Local LLM) ─────────────────────────────
  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    # Uncomment for NVIDIA GPU passthrough:
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: all
    #           capabilities: [gpu]

volumes:
  rik-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./data
  redis-data:
  minio-data:
  stalwart-data:
  ollama-data:
```

## Dockerfiles

### App Dockerfile (`app/Dockerfile`)

```dockerfile
FROM oven/bun:1 AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Build
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Production
FROM base AS production
WORKDIR /app
COPY --from=build /app/.output ./.output
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

EXPOSE 3000
CMD ["bun", "run", ".output/server/index.mjs"]
```

### Worker Dockerfile (`app/worker/Dockerfile`)

```dockerfile
FROM oven/bun:1 AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Build
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx tsx --build worker/index.ts

# Production
FROM base AS production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/worker ./worker
COPY --from=build /app/package.json ./

CMD ["bun", "run", "worker/index.js"]
```

## Development

For local development without Docker (faster iteration):

```bash
# Start infrastructure services only
docker compose up redis minio stalwart ollama -d

# Run app in dev mode
cd app
bun run dev

# Run worker in dev mode (separate terminal)
cd app
bunx tsx watch worker/index.ts
```

## Data Directory

The `data/` directory is bind-mounted and contains all persistent state:

```
data/
├── rik.db          # SQLite database
├── minio/          # MinIO object data (managed by MinIO container)
└── mail/           # Stalwart mail data (managed by Stalwart container)
```

To reset everything: stop containers and `rm -rf data/`. To backup: copy the entire `data/` directory.

## GPU Passthrough (Optional)

For faster LLM inference on NVIDIA GPUs, uncomment the `deploy` section in the Ollama service. Requires:
- NVIDIA Container Toolkit installed on host
- Compatible NVIDIA drivers

For Apple Silicon Macs: Ollama uses Metal acceleration automatically when run natively, but **not inside Docker** (Docker on Mac uses Linux VMs). For best performance on Mac, run Ollama natively and set `LLM_BASE_URL=http://host.docker.internal:11434/v1`.
