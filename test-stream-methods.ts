import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const result = streamText({
    model: openai('gpt-4o-mini'),
    prompt: 'hello, use the tool',
    tools: {
      myTool: tool({
        description: 'Test tool',
        parameters: z.object({}),
        execute: async () => {
          return { success: true }
        }
      } as any)
    }
  });

  const response = result.toUIMessageStreamResponse();
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let done = false;
  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      console.log(decoder.decode(value));
    }
  }
}

test().catch(console.error);
