import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

export const maxDuration = 30

const BASE_SYSTEM_PROMPT = `You are PeriodLens, the private, compassionate menstrual health assistant inside HERFLOW AI, built for campus students.

Core Principles:
- Provide calm, warm, concise, and evidence-based guidance aligned with WHO, NHS, ACOG, and India's NHM/MoHFW.
- When answering, gently take the user's current cycle day, phase, and logged symptoms into account so your answer feels truly personal and relevant to where they are in their cycle today.
- Use simple, reassuring language and brief bullet points. Avoid heavy clinical jargon.
- You are an educational health companion, NOT a doctor. Never provide medical diagnosis or prescribe medications.
- If the user reports severe pain, heavy flooding (soaking through a pad/tampon every hour), fainting, fever, or bleeding lasting over 7 days, advise seeing the campus health centre or doctor promptly, and calling 112 in emergencies.
- When myths or cultural taboos are mentioned, address them objectively with evidence and kindness.
- Respect privacy completely. Stay focused on menstrual, reproductive, and emotional wellbeing.`

export type UserContext = {
  name?: string
  campus?: string
  cycleDay?: number
  cycleLength?: number
  phase?: string
  nextPeriodInDays?: number
  todayMood?: string | null
  todaySymptoms?: string[]
}

export async function POST(req: Request) {
  const {
    messages,
    language = 'en',
    userContext,
  }: {
    messages: UIMessage[]
    language?: 'en' | 'hi'
    userContext?: UserContext
  } = await req.json()

  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY

  // If no Gemini API key is configured yet, provide a friendly educational stream
  if (!apiKey) {
    const hintText =
      language === 'hi'
        ? `नमस्ते ${userContext?.name || ''}! PeriodLens AI (Google Gemini द्वारा संचालित) को सक्रिय करने के लिए, कृपया अपना निःशुल्क GOOGLE_GENERATIVE_AI_API_KEY .env.local या Vercel Environment Variables में जोड़ें।\n\nआप Google AI Studio (https://aistudio.google.com) से 30 सेकंड में मुफ़्त API key ले सकते हैं।`
        : `Hi ${userContext?.name || 'there'}! To activate PeriodLens AI with Google Gemini, please add your free GOOGLE_GENERATIVE_AI_API_KEY in .env.local or your Vercel Project Settings.\n\nYou can generate a free Gemini API key in 30 seconds at https://aistudio.google.com.`

    const fallbackStream = new ReadableStream({
      start(controller) {
        controller.enqueue({ type: 'text-delta', delta: hintText })
        controller.enqueue({ type: 'finish' })
        controller.close()
      },
    })

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: fallbackStream as unknown as ReadableStream }),
    })
  }

  // Build personalized system prompt
  let contextSnippet = ''
  if (userContext) {
    contextSnippet = `
Current User Telemetry (Personalize your response based on this):
- Name: ${userContext.name || 'Student'} (${userContext.campus || 'Campus'})
- Cycle State: Day ${userContext.cycleDay ?? 14} of ${userContext.cycleLength ?? 28} (${userContext.phase || 'Ovulation window'})
- Next Period: in ${userContext.nextPeriodInDays ?? 14} days
- Today's Logged Mood: ${userContext.todayMood || 'Not recorded today'}
- Today's Logged Symptoms: ${
      userContext.todaySymptoms && userContext.todaySymptoms.length > 0
        ? userContext.todaySymptoms.join(', ')
        : 'None recorded today'
    }
`
  }

  const languageInstruction =
    language === 'hi'
      ? 'Respond in simple, natural, empathetic Hindi (Devanagari script).'
      : 'Respond in clear, supportive, and compassionate English.'

  const fullSystemPrompt = `${BASE_SYSTEM_PROMPT}

${contextSnippet}

Language Directive:
${languageInstruction}`

  const google = createGoogleGenerativeAI({
    apiKey,
  })

  const result = streamText({
    model: google('gemini-1.5-flash'),
    system: fullSystemPrompt,
    messages: await convertToModelMessages(messages),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
