# LLM Integration — Ollama

## Overview

Rik uses a local LLM (via Ollama) for:
- **Email classification** — categorize emails as invoice, actionable, newsletter, personal, spam, other
- **Invoice extraction** — pull structured data (vendor, amount, date, etc.) from invoice PDFs
- **Summarization** — generate email/thread summaries
- **Task suggestions** — suggest tasks from actionable emails

## Ollama Setup

Ollama runs as a Docker container and exposes an OpenAI-compatible API at `http://ollama:11434/v1`.

Recommended models:
- **llama3.1:8b** — good balance of speed and quality for classification/extraction
- **mistral:7b** — alternative, slightly faster
- **gemma2:9b** — good at structured output

The model is pulled on first use. To pre-pull during Docker build, add to the Ollama container's entrypoint:

```bash
ollama pull llama3.1:8b
```

## LLM Client

The LLM client is a thin wrapper around the OpenAI SDK (which works with any OpenAI-compatible API):

```tsx
// app/src/lib/llm.ts
import OpenAI from 'openai'

const llm = new OpenAI({
  baseURL: process.env.LLM_BASE_URL || 'http://ollama:11434/v1',
  apiKey: process.env.LLM_API_KEY || 'ollama', // Ollama doesn't need a real key
})

export async function complete(prompt: string, options?: {
  model?: string
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
}) {
  const response = await llm.chat.completions.create({
    model: options?.model || process.env.LLM_MODEL || 'llama3.1:8b',
    messages: [{ role: 'user', content: prompt }],
    temperature: options?.temperature ?? 0.1,
    max_tokens: options?.maxTokens ?? 2048,
    response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
  })
  return response.choices[0].message.content || ''
}

export { llm }
```

### Swapping to a cloud provider

Change two env vars:

```env
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

Or for Anthropic (via a proxy like LiteLLM that provides OpenAI-compatible API):

```env
LLM_BASE_URL=http://litellm:4000/v1
LLM_API_KEY=sk-...
LLM_MODEL=claude-sonnet-4-20250514
```

## Prompt Templates

### Email Classification

```
Classify the following email into exactly one category.

Categories:
- invoice: Contains a bill, invoice, or payment request
- actionable: Requires a response or action from the recipient
- newsletter: Marketing email, digest, or subscription content
- personal: Personal communication from a known contact
- spam: Unsolicited, irrelevant, or promotional junk
- other: Doesn't fit any of the above

Email:
From: {from}
Subject: {subject}
Body: {body_preview}

Respond with only the category name, nothing else.
```

### Invoice Extraction

```
Extract invoice data from the following text. Respond in JSON format.

{invoice_text}

Required JSON fields:
{
  "vendor": "company name",
  "invoice_number": "string or null",
  "amount_cents": number (total in smallest currency unit, e.g., cents),
  "currency": "ISO 4217 code (e.g., EUR, USD)",
  "issue_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "line_items": [
    { "description": "string", "quantity": number, "unit_price_cents": number }
  ]
}

If a field cannot be determined, use null. For amount, always convert to cents (multiply by 100).
```

## Performance Notes

- Ollama loads models into memory on first request. The first call will be slow (10-30s). Subsequent calls are fast.
- For classification (short output), expect ~1-2s per email on a modern machine with 8b model.
- For invoice extraction (longer structured output), expect ~5-10s.
- GPU acceleration: If the host has a NVIDIA GPU, mount it into the Ollama container for much faster inference. See `docs/docker.md` for GPU passthrough config.
- Consider keeping the model warm by setting `OLLAMA_KEEP_ALIVE=-1` to prevent unloading between requests.
