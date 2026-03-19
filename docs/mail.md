# Email System — Stalwart Mail Server

## Concept

Rik does **not** connect to your real mailbox. Instead, you set up forwarding rules in your existing email provider (Gmail, Outlook, etc.) to forward copies of emails to Rik's own mail server. This means:

- Rik never has your email credentials
- Rik only sees what you explicitly forward
- You can be selective — forward everything, or only specific labels/filters
- If Rik goes down, your real email is unaffected

## Stalwart Mail Server

Stalwart is a lightweight, Rust-based mail server that supports SMTP, IMAP, and JMAP. We use it as a local receiver.

### What it does

1. Receives incoming SMTP email on port 25
2. Stores the email
3. Fires a webhook to the Rik app notifying it of the new message
4. Optionally serves email via IMAP (port 993) if you want to connect a mail client

### Configuration

Stalwart config lives in `config/stalwart.toml`. Key settings:

```toml
[server]
hostname = "rik.local"

[server.listener.smtp]
bind = ["0.0.0.0:25"]
protocol = "smtp"

[server.listener.imap]
bind = ["0.0.0.0:993"]
protocol = "imap"

# Webhook on new mail
[webhook.new-mail]
url = "http://rik-app:3000/api/webhooks/mail"
events = ["message.received"]
```

### DNS / Forwarding Setup

For local-only use (forwarding from Gmail/Outlook), you need the Stalwart SMTP port accessible. Options:

1. **Port forwarding on your router** — forward port 25 to your Docker host. Then set your domain's MX record to your public IP.
2. **Cloudflare Tunnel** — expose Stalwart's SMTP port via a tunnel. No open ports needed.
3. **Relay through a cheap VPS** — run a tiny SMTP relay on a VPS that forwards to your local Stalwart.
4. **Local network only** — if you just want to test, send emails directly to `localhost:25`.

The simplest production setup is option 2 (Cloudflare Tunnel) since it avoids exposing ports.

### Email Domain

You'll need a domain (or subdomain) for receiving email, e.g., `rik.yourdomain.com`. Set the MX record to point to wherever Stalwart is accessible.

Forwarding rule in Gmail: `Filters → Forward to rik@rik.yourdomain.com`

## Processing Pipeline

When Stalwart receives an email:

1. Stalwart stores the raw email and fires the webhook
2. The webhook hits `POST /api/webhooks/mail` on the Rik app
3. The server function validates the webhook and enqueues a `process-mail` BullMQ job
4. The worker picks up the job and:
   - Parses the raw email (headers, body, attachments)
   - Stores attachments in MinIO
   - Stores email metadata in SQLite
   - Classifies the email via LLM
   - Triggers follow-up jobs (e.g., invoice extraction)

## Libraries

- **Email parsing**: Use `mailparser` (Node.js) to parse raw RFC 2822 emails
- **MIME handling**: `mailparser` handles multipart MIME, attachments, inline images
- **HTML to text**: Use `html-to-text` for generating plain text previews from HTML emails
