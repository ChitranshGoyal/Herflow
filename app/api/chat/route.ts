import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  createUIMessageStream,
} from 'ai'
import { createGoogle } from '@ai-sdk/google'

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
  try {
    const {
      messages,
      language = 'en',
      userContext,
    }: {
      messages: UIMessage[]
      language?: 'en' | 'hi'
      userContext?: UserContext
    } = await req.json()

    // Support all common naming variants for the Gemini API key
    const rawKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY

    const apiKey = rawKey?.trim().replace(/^["']|["']$/g, '')

    // If no API key was passed to the current deployment, stream a helpful notice
    if (!apiKey) {
      return streamNotice(
        language === 'hi'
          ? `नमस्ते ${userContext?.name || ''}! PeriodLens AI को सक्रिय करने के लिए Vercel में GOOGLE_GENERATIVE_AI_API_KEY सेट होना आवश्यक है। Vercel में Environment Variable जोड़ने के बाद "Redeploy" करना अनिवार्य होता है।`
          : `Hi ${userContext?.name || 'there'}! To activate PeriodLens AI, your GOOGLE_GENERATIVE_AI_API_KEY must be set in Vercel Project Settings. After adding it, you must trigger a Redeploy.`
      )
    }

    // Build personalized prompt based on individual user's cycle telemetry
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

    // Set the env var so the SDK can also read it automatically
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey

    const google = createGoogle({ apiKey })

    // Convert UI messages to model messages
    const modelMessages = await convertToModelMessages(messages)

    // Guard: if no messages to send, return a greeting
    if (!modelMessages || modelMessages.length === 0) {
      return streamNotice(
        language === 'hi'
          ? 'नमस्ते! आज मैं आपकी कैसे मदद कर सकती हूँ?'
          : 'Hi there! How can I help you with your menstrual health today?'
      )
    }

    const result = streamText({
      model: google('gemini-2.0-flash'),
      system: fullSystemPrompt,
      messages: modelMessages,
      onError({ error }) {
        console.error('PeriodLens Gemini streaming error:', error)
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (err: unknown) {
    console.error('PeriodLens AI error:', err)
    const errorMsg =
      err instanceof Error ? err.message : String(err)

    return streamNotice(
      `PeriodLens Error: ${errorMsg}\n\nPlease check your GOOGLE_GENERATIVE_AI_API_KEY in Vercel settings and trigger a Redeploy.`
    )
  }
}

/** Helper: stream a plain-text notice back to the UI */
function streamNotice(text: string) {
  const stream = createUIMessageStream({
    execute({ writer }) {
      writer.write({ type: 'start' })
      writer.write({ type: 'text-start', id: 'notice-1' })
      writer.write({ type: 'text-delta', id: 'notice-1', delta: text })
      writer.write({ type: 'text-end', id: 'notice-1' })
      writer.write({ type: 'finish' })
    },
  })
  return createUIMessageStreamResponse({ stream })
}
