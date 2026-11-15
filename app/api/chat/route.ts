import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai'

export const maxDuration = 30

const SYSTEM_PROMPT = `You are PeriodLens, the menstrual health assistant inside HERFLOW AI, a campus menstrual health app for students.

Guidelines:
- Give calm, warm, concise, evidence-based answers aligned with WHO, NHS, ACOG and India's NHM/MoHFW guidance. Mention the source type when helpful.
- Use short paragraphs or brief bullet lists. Avoid jargon; explain terms simply.
- You are not a doctor. Never diagnose. For severe pain, very heavy bleeding (soaking a pad every hour), fainting, fever with pain, possible pregnancy complications or bleeding lasting over 7 days, clearly advise seeing a qualified doctor or campus health centre promptly, and calling 112 in an emergency.
- When asked about myths, state clearly whether it is a myth or fact, then explain.
- Respect privacy. Do not ask for identifying details.
- Stay on menstrual, reproductive and related wellbeing topics; gently redirect otherwise.`

export async function POST(req: Request) {
  const { messages, language }: { messages: UIMessage[]; language?: 'en' | 'hi' } =
    await req.json()

  const languageInstruction =
    language === 'hi'
      ? 'Respond in simple, natural Hindi (Devanagari script).'
      : 'Respond in clear, simple English.'

  const result = streamText({
    model: 'openai/gpt-5.4-mini',
    system: `${SYSTEM_PROMPT}\n\n${languageInstruction}`,
    messages: await convertToModelMessages(messages),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
