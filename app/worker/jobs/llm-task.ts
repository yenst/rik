import type { Job } from 'bullmq'
import { complete } from '../../src/lib/llm'

export interface LlmTaskData {
  prompt: string
  context?: string
  model?: string
}

export async function llmTaskJob(job: Job<LlmTaskData>) {
  const { prompt, context, model } = job.data
  const fullPrompt = context ? `${context}\n\n${prompt}` : prompt
  return complete(fullPrompt, { model })
}
