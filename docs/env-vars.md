# Environment Variables

All env vars are set in `docker-compose.yml` for containerized usage and in `.env` for local development.

## Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_PATH` | `/data/rik.db` | Path to SQLite database file |
| `REDIS_HOST` | `redis` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `MINIO_ENDPOINT` | `http://minio:9000` | MinIO S3 API endpoint |
| `MINIO_ROOT_USER` | `rik` | MinIO access key |
| `MINIO_ROOT_PASSWORD` | `riksecret` | MinIO secret key |
| `LLM_BASE_URL` | `http://ollama:11434/v1` | OpenAI-compatible API base URL |
| `LLM_API_KEY` | `ollama` | API key for LLM provider (Ollama ignores this) |
| `LLM_MODEL` | `llama3.1:8b` | Model name to use for LLM calls |
| `CALDAV_URL` | _(empty)_ | CalDAV server URL for agenda sync (optional) |
| `CALDAV_USERNAME` | _(empty)_ | CalDAV username (optional) |
| `CALDAV_PASSWORD` | _(empty)_ | CalDAV password (optional) |

## Swapping LLM Providers

### Ollama (default, local)

```env
LLM_BASE_URL=http://ollama:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=llama3.1:8b
```

### OpenAI

```env
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

### Ollama on Mac (native, outside Docker for GPU acceleration)

```env
LLM_BASE_URL=http://host.docker.internal:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=llama3.1:8b
```

## Local Development

For developing outside Docker (running app/worker natively):

```env
DATABASE_PATH=./data/rik.db
REDIS_HOST=localhost
REDIS_PORT=6379
MINIO_ENDPOINT=http://localhost:9000
MINIO_ROOT_USER=rik
MINIO_ROOT_PASSWORD=riksecret
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=llama3.1:8b
```
