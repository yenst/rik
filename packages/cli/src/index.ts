import { sendMessage } from './client'
import { createInterface } from 'readline'

const args = process.argv.slice(2)

// One-shot mode: rik "create a task to buy groceries"
if (args.length > 0 && args[0] !== 'chat') {
  const message = args.join(' ')
  try {
    const { reply } = await sendMessage(message)
    console.log(reply)
  } catch (err) {
    console.error('Failed to reach Rik:', (err as Error).message)
    process.exit(1)
  }
  process.exit(0)
}

// Interactive mode: rik chat
console.log('Rik — type a message, ctrl+c to exit\n')

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> ',
})

let conversationId: string | undefined

rl.prompt()

rl.on('line', async (line) => {
  const message = line.trim()
  if (!message) {
    rl.prompt()
    return
  }

  try {
    const { reply, conversationId: convId } = await sendMessage(message, conversationId)
    conversationId = convId
    console.log(`\n${reply}\n`)
  } catch (err) {
    console.error('Error:', (err as Error).message)
  }

  rl.prompt()
})
