import { NextResponse } from 'next/server'

function realtimeContext() {
  const now = new Date()
  const timeZone = 'Asia/Dhaka'
  const getParts = (date: Date, calendar: string, locale: string) => new Intl.DateTimeFormat(locale, { calendar, year: 'numeric', month: 'long', day: 'numeric', timeZone }).formatToParts(date).reduce<Record<string, string>>((result, part) => { result[part.type] = part.value; return result }, {})
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const gregorian = getParts(now, 'gregory', 'en-GB')
  const bengali = getParts(now, 'beng', 'bn-BD')
  const yesterdayGregorian = getParts(yesterday, 'gregory', 'en-GB')
  const yesterdayBengali = getParts(yesterday, 'beng', 'bn-BD')
  return `Authoritative live date context for Bangladesh (timezone ${timeZone}): now=${now.toISOString()}; today Gregorian=${gregorian.day} ${gregorian.month}, ${gregorian.year}; today Bengali=${bengali.day} ${bengali.month}, ${bengali.year}; yesterday Gregorian=${yesterdayGregorian.day} ${yesterdayGregorian.month}, ${yesterdayGregorian.year}; yesterday Bengali=${yesterdayBengali.day} ${yesterdayBengali.month}, ${yesterdayBengali.year}. For date questions, calculate from this context—not from the user's assumption or model memory. Always use the exact requested order: Bengali "${bengali.day} ${bengali.month}, ${bengali.year}" and English "${gregorian.day} ${gregorian.month}, ${gregorian.year}". Never say only "${bengali.day} ভাদ্র" unless the calculated month is actually ভাদ্র.`
}

const SYSTEM_PROMPT = (assistant: string) => `You are ${assistant || 'Boithok AI'}, a natural, warm, independent multilingual assistant. ${realtimeContext()} Understand the latest prompt and answer directly. Match the user's language and script. For date questions, use the current date/time context above, state the calendar and timezone, and never guess or use a stale training date. For arithmetic and logic, calculate carefully, show concise steps when useful, verify the result, and use exact notation. Render mathematical expressions in LaTeX with double-dollar delimiters. For linguistics and phonetics, act as a specialist. Use phonemic slashes for broad forms, for example /h/ and /tʃ/, and square brackets for narrow allophones, for example [tʰ] or [ɾ]. Include stress ˈ/ˌ, vowel length ː, syllable boundaries ., diacritics, minimal pairs, place/manner/voicing, IPA name and Unicode symbol when relevant. Distinguish phonetics from phonology, state the language and accent/variety, and never invent an IPA transcription when pronunciation is uncertain. Never repeat introductions, the prompt, or fixed wording. Do not ask unnecessary clarification questions. Be friendly, concise, specific, and complete the task when possible. For Bengali, mirror the user's level of respect: if the user uses তুই/তোকে/তোর, reply with তুই/তোকে/তোর; if the user uses আপনি/আপনার, reply with আপনি/আপনার; if the user uses তুমি/তোমার, reply with তুমি/তোমার. Never mix these forms in one reply. Do not use তুমি or আপনি when the user clearly uses তুই.`
const TIMEOUT_MS = 22000

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
type ProviderResult = { text: string; provider: string }

async function pollinationsChat(messages: ChatMessage[]): Promise<ProviderResult> {
  const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'openai', temperature: 0.7, max_tokens: 1200, messages }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const data = await response.json()
  const text = data?.choices?.[0]?.message?.content
  if (!response.ok || typeof text !== 'string' || !text.trim()) throw new Error(`pollinations-gen:${response.status}`)
  return { text: text.trim(), provider: 'Pollinations' }
}

async function pollinationsFree(messages: ChatMessage[]): Promise<ProviderResult> {
  const prompt = messages.filter((message) => message.role !== 'system').map((message) => `${message.role}: ${message.content}`).join('\\n')
  const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, {
    headers: { Accept: 'text/plain' }, signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const text = await response.text()
  if (!response.ok || !text.trim()) throw new Error(`pollinations-free:${response.status}`)
  return { text: text.trim(), provider: 'Pollinations Free' }
}

async function huggingFaceChat(messages: ChatMessage[]): Promise<ProviderResult> {
  const token = process.env.HF_TOKEN
  if (!token) throw new Error('huggingface:missing-token')
  const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ model: process.env.HF_MODEL || 'Qwen/Qwen2.5-72B-Instruct', temperature: 0.7, max_tokens: 1200, messages }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const data = await response.json()
  const text = data?.choices?.[0]?.message?.content
  if (!response.ok || typeof text !== 'string' || !text.trim()) throw new Error(`huggingface:${response.status}`)
  return { text: text.trim(), provider: 'Hugging Face' }
}

export async function POST(request: Request) {
  try {
    const { messages, assistant } = await request.json()
    if (!Array.isArray(messages) || messages.length === 0) return NextResponse.json({ error: 'A message is required.' }, { status: 400 })

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT(assistant) },
      ...messages.map((message: { role: 'user' | 'assistant'; text: string }) => ({ role: message.role, content: message.text })),
    ]

    const providers = [pollinationsChat, pollinationsFree, huggingFaceChat]
    for (const provider of providers) {
      try {
        const result = await provider(chatMessages)
        return NextResponse.json(result)
      } catch (error) {
        console.warn('[v0] AI provider failed:', error instanceof Error ? error.message : 'unknown')
      }
    }

    return NextResponse.json({ error: 'সব ফ্রি AI provider এখন ব্যস্ত। কিছুক্ষণ পরে আবার চেষ্টা করুন।' }, { status: 503 })
  } catch (error) {
    console.error('[v0] Provider router failed:', error)
    return NextResponse.json({ error: 'অনুরোধটি সম্পন্ন করা যাচ্ছে না। আবার চেষ্টা করুন।' }, { status: 503 })
  }
}
