# Email System — IMAP Polling

## Concept

Rik polls an IMAP mailbox on an interval and processes new emails. You choose what goes into that mailbox — either by forwarding from your real inbox, or by pointing Rik at a specific folder/label.

## Two Setups

### Option A: Self-hosted mailbox (recommended)

Run Stalwart (included in docker-compose) or on a separate machine like a Raspberry Pi. You get your own mail server at `rik@yourdomain.com`.

```
Your real mailbox → forward rules → rik@yourdomain.com → Stalwart → Rik polls via IMAP
```

- Full containment — Rik never touches your real mailbox
- You control exactly what gets forwarded
- No third-party dependencies
- Requires a domain with MX records pointing at Stalwart

### Option B: External IMAP provider

Point Rik at any IMAP mailbox — Gmail, Outlook, Migadu, etc. Create a dedicated account or use a label/folder.

```
Your real mailbox → forward rules → rik.assistant@gmail.com → Rik polls via IMAP
```

- No infrastructure to manage
- Works with any IMAP provider
- Free with a dedicated Gmail/Outlook account

## How It Works

```
IMAP mailbox (Stalwart, Gmail, etc.)
  │
  │  IMAP connection (poll every N minutes)
  ▼
Worker: sync-mail job (repeating)
  │
  ├── Connect to IMAP server
  ├── Fetch unseen messages from configured folder
  ├── Skip already-processed emails (by message ID)
  ├── Enqueue each new email as a process-mail job
  └── Mark as seen in IMAP
        │
        ▼
Worker: process-mail job
  ├── Parse email (from, to, subject, body, attachments)
  ├── Store attachments → MinIO
  ├── Store email metadata → SQLite
  ├── Classify via LLM (invoice, actionable, newsletter, etc.)
  └── If invoice → enqueue extract-invoice job
```

## Configuration

### Stalwart (self-hosted, default in docker-compose)

Stalwart is included in `docker-compose.yml` and configured by default. The worker connects to it at `stalwart:993`.

To use it with your domain:
1. Point your domain's MX record at the machine running Stalwart
2. Set up the `rik@yourdomain.com` account in Stalwart's admin panel
3. Update the IMAP env vars if you changed the credentials

For a Raspberry Pi setup, run Stalwart natively on the Pi and point `IMAP_HOST` at the Pi's IP.

```env
IMAP_HOST=stalwart           # or your Pi's IP
IMAP_PORT=993
IMAP_USER=rik@yourdomain.com
IMAP_PASS=your-password
IMAP_FOLDER=INBOX
IMAP_POLL_INTERVAL=300000    # 5 minutes
```

### Gmail

1. Create a dedicated Gmail account (e.g. `rik.assistant@gmail.com`)
2. Enable IMAP in Gmail settings
3. Create an App Password (Google Account → Security → App Passwords)

```env
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=rik.assistant@gmail.com
IMAP_PASS=your-16-char-app-password
IMAP_FOLDER=INBOX
IMAP_POLL_INTERVAL=300000
```

### Outlook

```env
IMAP_HOST=outlook.office365.com
IMAP_PORT=993
IMAP_USER=rik@outlook.com
IMAP_PASS=your-password
IMAP_FOLDER=INBOX
```

## Polling Behavior

- The `sync-mail` worker job runs on a repeating schedule (default every 5 minutes)
- Fetches only **unseen** messages from the configured folder
- Deduplicates by `messageId` against the database
- Marks fetched emails as `\Seen` in IMAP
- Silently skips if IMAP credentials aren't configured

## Manual Ingestion

For testing or one-off imports, POST raw emails directly:

```bash
curl -s -X POST http://localhost:3124/api/webhooks/mail \
  -H "Content-Type: text/plain" \
  -d 'From: test@example.com
To: rik@local
Subject: Test email
Content-Type: text/plain

This is a test email body.'
```

## Libraries

- **IMAP client**: `imapflow` — modern, promise-based IMAP client
- **Email parsing**: `mailparser` — parses raw RFC 2822 emails
- **HTML to text**: `html-to-text` — plain text previews from HTML emails
