import OpenAI from 'openai'

const llm = new OpenAI({
  baseURL: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.LLM_API_KEY || 'ollama',
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
  return response.choices[0]?.message.content || ''
}

export { llm }
