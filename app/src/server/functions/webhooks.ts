import { mailQueue } from '../../lib/queues'

export async function enqueueMailProcessing(raw: string) {
  await mailQueue.add('process-mail', { raw })
}
