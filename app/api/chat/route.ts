import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  createUIMessageStream,
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
      const hint =
        language === 'hi'
          ? `नमस्ते ${userContext?.name || ''}! PeriodLens AI को सक्रिय करने के लिए Vercel में GOOGLE_GENERATIVE_AI_API_KEY सेट होना आवश्यक है।\n\nयदि आपने अभी Environment Variable जोड़ा है, तो कृपया ध्यान दें: Vercel में Environment Variable जोड़ने के बाद "Redeploy" करना अनिवार्य होता है ताकि नए variables लागू हो सकें।`
          : `Hi ${userContext?.name || 'there'}! To activate PeriodLens AI with Google Gemini, your GOOGLE_GENERATIVE_AI_API_KEY must be active.\n\nImportant note: If you just added the key in Vercel Project Settings, you must trigger a **Redeploy** (Deployments → Latest Deployment → Redeploy) for Vercel to inject the new key into the running application.`

      const stream = createUIMessageStream({
        execute({ writer }) {
          writer.write({ type: 'start' })
          writer.write({ type: 'text-start', id: 'hint-1' })
          writer.write({ type: 'text-delta', id: 'hint-1', delta: hint })
          writer.write({ type: 'text-end', id: 'hint-1' })
          writer.write({ type: 'finish' })
        },
      })

      return createUIMessageStreamResponse({ stream })
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

    if (apiKey) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey
    }

    const google = createGoogleGenerativeAI({
      apiKey,
    })

    const modelMessages = await convertToModelMessages(messages)

    const result = streamText({
      model: google('gemini-1.5-flash'),
      system: fullSystemPrompt,
      messages: modelMessages,
      onError({ error }) {
        console.error('PeriodLens Gemini streaming error:', error)
      },
    })

    if (typeof result.toUIMessageStreamResponse === 'function') {
      return result.toUIMessageStreamResponse()
    }

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    })
  } catch (err: unknown) {
    console.error('PeriodLens AI error:', err)
    const errorMsg =
      err instanceof Error ? err.message : 'Unknown error communicating with Gemini AI.'

    const stream = createUIMessageStream({
      execute({ writer }) {
        writer.write({ type: 'start' })
        writer.write({ type: 'text-start', id: 'err-1' })
        writer.write({
          type: 'text-delta',
          id: 'err-1',
          delta: `PeriodLens Notice: ${errorMsg}\n\nPlease check your GOOGLE_GENERATIVE_AI_API_KEY in Vercel settings and ensure you have triggered a Redeploy.`,
        })
        writer.write({ type: 'text-end', id: 'err-1' })
        writer.write({ type: 'finish' })
      },
    })

    return createUIMessageStreamResponse({ stream })
  }
}
