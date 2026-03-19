# Storage — SQLite + MinIO

## SQLite

### Purpose

All structured data: tasks, emails metadata, invoices, agenda events, attachments metadata.

### Location

Single file at `data/rik.db`, mounted into both the app and worker containers via Docker volume.

### Configuration

```tsx
sqlite.pragma('journal_mode = WAL')   // Write-Ahead Logging for better read concurrency
sqlite.pragma('foreign_keys = ON')    // Enforce foreign key constraints
sqlite.pragma('busy_timeout = 5000')  // Wait up to 5s if database is locked
```

WAL mode is critical since both the app and worker write to the same database. It allows concurrent reads and serializes writes without blocking readers.

### Backup

SQLite backup is just copying the file:

```bash
# From host, while containers are running (safe with WAL mode)
cp data/rik.db data/rik.db.backup
```

Or use SQLite's built-in backup API for a consistent snapshot.

### Schema Management

Drizzle Kit handles migrations. Schema is the source of truth in `app/src/server/db/schema.ts`.

```bash
# Generate migration after schema change
bunx drizzle-kit generate

# Apply pending migrations
bunx drizzle-kit migrate

# Inspect current database
bunx drizzle-kit studio
```

Drizzle Studio (`bunx drizzle-kit studio`) gives you a web UI to browse/edit the database — useful for debugging.

### Scaling Note

SQLite handles single-user workloads extremely well. If write contention ever becomes an issue (unlikely for a personal assistant), options:
1. Use `libsql` (Turso's SQLite fork) — better write concurrency
2. Swap to Postgres — Drizzle makes this a driver change, not a rewrite

## MinIO (S3-compatible Object Storage)

### Purpose

Binary files that don't belong in SQLite:
- Email attachments (PDFs, images, documents)
- Original invoice PDFs
- Any uploaded files

### Configuration

MinIO runs as a Docker container with data stored in `data/minio/`.

```env
MINIO_ROOT_USER=rik
MINIO_ROOT_PASSWORD=riksecret
MINIO_ENDPOINT=http://minio:9000
```

### Buckets

- `attachments` — email attachments
- `invoices` — invoice PDF originals
- `uploads` — user-uploaded files

Buckets are created on first startup via an init script or on-demand in the app.

### Client

```tsx
// app/src/lib/minio.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || 'http://minio:9000',
  region: 'us-east-1', // MinIO requires a region but doesn't use it
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER || 'rik',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'riksecret',
  },
  forcePathStyle: true, // Required for MinIO
})

export async function uploadFile(bucket: string, key: string, body: Buffer, contentType: string) {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }))
  return key
}

export async function getPresignedUrl(bucket: string, key: string, expiresIn = 3600) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn })
}
```

### Frontend Access

The frontend never talks to MinIO directly. Instead:
1. Frontend requests a presigned URL from a server function
2. Server function generates a presigned URL via MinIO's S3 API
3. Frontend uses the presigned URL to download/display the file

This keeps MinIO credentials server-side only.

### Cleanup

Orphaned files (e.g., from deleted emails) can be cleaned up with a periodic job that compares MinIO keys against the database. Not critical for v1.
