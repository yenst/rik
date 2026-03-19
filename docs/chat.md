# Chat Interface — Talking to Rik

## Concept

Rik isn't just a dashboard you look at — it's an assistant you talk to. You should be able to waffle to Rik from anywhere: CLI, the web dashboard, Discord, or any future integration.

All of these are just **clients** that talk to the same backend. Rik's "brain" is a single chat endpoint that understands context (your tasks, emails, invoices, agenda) and can take actions.

## Architecture

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   CLI        │  │  Web Chat    │  │  Discord Bot  │
│   (rik-cli)  │  │  (dashboard) │  │  (bot)        │
└──────┬───────┘  └──────┬───────┘  └──────┬────────┘
       │                 │                 │
       │     HTTP / WebSocket              │
       └────────────┬──────────────────────┘
                    ▼
          Rik App — Chat Server Function
                    │
          ┌─────────┴──────────┐
          │  LLM + Tool Use    │
          │                    │
          │  Tools:            │
          │  - create_task     │
          │  - list_tasks      │
          │  - search_emails   │
          │  - get_agenda      │
          │  - mark_invoice    │
          │  - ...             │
          └─────────┬──────────┘
                    │
              SQLite / MinIO
```

## How It Works

1. User sends a message from any client (CLI, web, Discord)
2. Message hits a server function / API endpoint on the Rik app
3. Rik builds a prompt with:
   - The user's message
   - Conversation history (stored in SQLite)
   - System prompt describing Rik's personality and available tools
4. Sends to LLM (Ollama or OpenAI-compatible) with tool definitions
5. LLM responds — either a plain text reply or a tool call (e.g., "create a task")
6. If tool call → execute it (create task, search emails, etc.) → feed result back to LLM → get final response
7. Response sent back to the client

## Tool Definitions

Rik exposes its features as LLM tools. These map directly to existing server function logic:

| Tool | Description | Example trigger |
|------|-------------|-----------------|
| `create_task` | Create a new task | "remind me to call the dentist tomorrow" |
| `list_tasks` | List/search tasks | "what's on my plate today?" |
| `complete_task` | Mark task done | "done with the dentist thing" |
| `search_emails` | Search emails | "did I get anything from Amazon?" |
| `get_email` | Read a specific email | "show me that invoice from Hetzner" |
| `get_agenda` | Get upcoming events | "what's coming up this week?" |
| `create_event` | Add calendar event | "block out Friday afternoon for focus time" |
| `list_invoices` | List invoices | "any unpaid invoices?" |
| `mark_invoice_paid` | Mark invoice paid | "paid the Hetzner one" |
| `summarize_email` | Summarize an email | "tldr that newsletter" |

## Conversation Storage

Conversations are stored in SQLite so Rik has memory across sessions:

```
conversations table:
  id, client (cli/web/discord), created_at, updated_at

messages table:
  id, conversation_id, role (user/assistant/tool), content, tool_name, tool_args, tool_result, created_at
```

Each client type gets its own conversation thread by default. The CLI could also support named conversations.

## CLI Client — `rik-cli`

A lightweight Node.js CLI that talks to the Rik app over HTTP.

```bash
# One-shot message
rik "add a task to review the PR by tomorrow"

# Interactive mode
rik chat
> what's on my agenda today?
You have 2 events:
- 10:00 Standup
- 14:00 Design review

> add a task to prep for the design review
Created task: "Prep for design review" (due: today, priority: medium)

> thanks
No worries 👍
```

### Implementation

- Lives in `packages/cli/` as a separate package in the monorepo
- Uses `commander` or `yargs` for arg parsing
- Calls `POST http://localhost:3000/api/chat` with the message
- For interactive mode, uses `readline` or `inquirer` for the REPL
- Auth: local API key or no auth (localhost only)

### CLI Structure

```
packages/cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Entry point, arg parsing
│   ├── client.ts         # HTTP client for Rik API
│   ├── interactive.ts    # REPL / interactive chat mode
│   └── config.ts         # Read ~/.rikrc for endpoint URL, API key
└── bin/
    └── rik               # Symlinked binary
```

Install globally or use via `bunx`:

```bash
# From the monorepo
bun add -g ./packages/cli

# Or
bunx rik "what's up"
```

Configuration in `~/.rikrc`:

```json
{
  "endpoint": "http://localhost:3000",
  "apiKey": "optional-key"
}
```

## Web Chat

A chat panel in the dashboard UI — slide-out from the side or a dedicated `/chat` route.

- Same API endpoint as CLI
- Messages stream in via Server-Sent Events or WebSocket
- Shows tool call results inline (e.g., "Created task: ..." with a link to the task)
- Conversation history visible and scrollable

## Discord Bot (Future)

A Discord bot that forwards DMs or channel messages to the same chat endpoint.

- Lives in `packages/discord-bot/` (future, not in initial build)
- Uses `discord.js`
- Maps Discord user → Rik conversation
- Responds in the same channel/DM
- Can show rich embeds for tasks, invoices, etc.

## System Prompt

Rik's personality and instructions for the LLM:

```
You are Rik, a personal assistant. You help manage tasks, emails, invoices, and calendar events.

You have access to tools that let you interact with the user's data. Use them when the user asks you to do something actionable.

Be concise and casual. Match the user's tone — if they're brief, be brief. If they waffle, waffle back a bit.

When creating tasks from conversation, infer sensible defaults:
- Priority: medium unless they say it's urgent/important
- Due date: infer from context ("tomorrow", "by Friday", "end of week")
- Title: keep it short, extract the core action

When the user asks about emails or invoices, search first, then summarize. Don't dump raw data.

If you're not sure what the user wants, ask. Don't guess and take action.
```

## API Endpoint

```
POST /api/chat

Body:
{
  "message": "string",
  "conversationId": "string (optional — omit to start new)",
  "client": "cli" | "web" | "discord"
}

Response:
{
  "reply": "string",
  "conversationId": "string",
  "actions": [
    { "type": "task_created", "id": "...", "title": "..." },
    { "type": "email_found", "id": "...", "subject": "..." }
  ]
}
```

The `actions` array lets clients render rich UI for what Rik did (links to created tasks, found emails, etc.) without parsing the text reply.
