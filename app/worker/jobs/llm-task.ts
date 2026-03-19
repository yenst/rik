import type { Job } from 'bullmq'

export interface LlmTaskData {
  prompt: string
  context?: string
  model?: string
}

export async function llmTaskJob(job: Job<LlmTaskData>) {
  console.log(`[llm-task] Running LLM task: ${job.data.prompt.slice(0, 50)}...`)
  // TODO Phase 5: call Ollama/OpenAI-compatible API, return result
}
