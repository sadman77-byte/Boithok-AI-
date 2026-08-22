import { NextResponse } from 'next/server'

function banglaDate(date: Date) {
  // Bangladesh civil Bangla calendar: 1 Boishakh is 14 April; months 1–6 are 31 days, months 7–12 are 30 days, with Falgun 31 in leap years.
  const year = date.getUTCFullYear() - (date.getUTCMonth() < 3 || (date.getUTCMonth() === 3 && date.getUTCDate() < 14) ? 594 : 593)
  const start = Date.UTC(year + 593, 3, 14)
  const dayOfYear = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86400000)
  const leap = new Date(Date.UTC(date.getUTCFullYear(), 1, 29)).getUTCDate() === 29
  const monthLengths = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, leap ? 31 : 30]
  let remaining = dayOfYear
  let month = 0
  while (remaining >= monthLengths[month]) { remaining -= monthLengths[month]; month += 1 }
  const names = ['বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন', 'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র']
  return `${remaining + 1} ${names[month]}, ${year}`
}

function realtimeContext() {
  const now = new Date()
  const timeZone = 'Asia/Dhaka'
  const localParts = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).formatToParts(now).reduce<Record<string, string>>((result, part) => { result[part.type] = part.value; return result }, {})
  const localDate = new Date(Date.UTC(Number(localParts.year), Number(localParts.month) - 1, Number(localParts.day)))
  const yesterday = new Date(localDate.getTime() - 86400000)
  const dayBeforeYesterday = new Date(localDate.getTime() - 2 * 86400000)
  const gregorian = (date: Date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
  return `Authoritative live Bangladesh calendar context (timezone ${timeZone}, do not use Intl beng or guess): today Gregorian=${gregorian(localDate)}; today Bangla=${banglaDate(localDate)}; yesterday Gregorian=${gregorian(yesterday)}; yesterday Bangla=${banglaDate(yesterday)}; day before yesterday Gregorian=${gregorian(dayBeforeYesterday)}; day before yesterday Bangla=${banglaDate(dayBeforeYesterday)}. Bangladesh Bangla format is "day month, year". For example, under this official civil conversion, 19 August 2026 = ৪ ভাদ্র, ১৪৩৩; 20 August 2026 = ৫ ভাদ্র, ১৪৩৩; 21 August 2026 = ৬ ভাদ্র, ১৪৩৩. Correct false user-provided date mappings politely and show both calendars.`
}

const SYSTEM_PROMPT = (assistant: string) => `You are ${assistant || 'Boithok AI'}, a natural, warm, independent multilingual assistant. ${realtimeContext()} Understand the latest prompt and answer directly. Match the user's language and script. For date questions, use the current date/time context above, state the calendar and timezone, and never guess or use a stale training date. For arithmetic and logic, calculate carefully, show concise steps when useful, verify the result, and use exact notation. Render mathematical expressions in LaTeX with double-dollar delimiters. For linguistics and phonetics, act as a specialist. Use phonemic slashes for broad forms, for example /h/ and /tʃ/, and square brackets for narrow allophones, for example [tʰ] or [ɾ]. Include stress ˈ/ˌ, vowel length ː, syllable boundaries ., diacritics, minimal pairs, place/manner/voicing, IPA name and Unicode symbol when relevant. Distinguish phonetics from phonology, state the language and accent/variety, and never invent an IPA transcription when pronunciation is uncertain. Never repeat introductions, the prompt, or fixed wording. Do not ask unnecessary clarification questions. Be friendly, concise, specific, and complete the task when possible. For Bengali, mirror the user's level of respect: if the user uses তুই/তোকে/তোর, reply with তুই/তোকে/তোর; if the user uses আপনি/আপনার, reply with আপনি/আপনার; if the user uses তুমি/তোমার, reply with তুমি/তোমার. Never mix these forms in one reply. Do not use তুমি or আপনি when the user clearly uses তুই.`
const TIMEOUT_MS = 8000
const MAX_CONTEXT_MESSAGES = 8
const MAX_MESSAGE_CHARS = 6000

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
    body: JSON.stringify({ model: process.env.HF_MODEL || 'Qwen/Qwen3-4B-Thinking-2507:fastest', temperature: 0.7, max_tokens: 1200, messages }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const data = await response.json()
  const text = data?.choices?.[0]?.message?.content
  if (!response.ok || typeof text !== 'string' || !text.trim()) throw new Error(`huggingface:${response.status}:${data?.error || 'empty-response'}`)
  return { text: text.trim(), provider: 'Hugging Face' }
}

export async function POST(request: Request) {
  try {
    const { messages, assistant } = await request.json()
    if (!Array.isArray(messages) || messages.length === 0) return NextResponse.json({ error: 'A message is required.' }, { status: 400 })

    const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES)
    const chatMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT(assistant) },
      ...recentMessages.map((message: { role: 'user' | 'assistant'; text: string }) => ({
        role: message.role,
        content: String(message.text).slice(0, MAX_MESSAGE_CHARS),
      })),
    ]

    // Start every available provider together. The first valid response wins.
    const providers = [pollinationsChat, pollinationsFree]
    if (process.env.HF_TOKEN) providers.push(huggingFaceChat)

    try {
      const result = await Promise.any(providers.map((provider) => provider(chatMessages)))
      return NextResponse.json(result)
    } catch (error) {
      console.warn('[v0] All AI providers failed:', error)
      const latest = String(recentMessages[recentMessages.length - 1]?.text || '')
      const isBengali = /[\u0980-\u09ff]/.test(latest)
      const fallback = isBengali
        ? `আমি Boithok AI। তোর কথাটা বুঝেছি। এখন বাইরের AI service-এ সংযোগ হচ্ছে না, তবে তুই চাইলে আবার পাঠা—আমি এখানেই আছি।`
        : `I’m Boithok AI. I understand your message. The external AI services are not responding right now, but you can send it again and I’ll keep helping.`
      return NextResponse.json({ text: fallback, provider: 'Boithok fallback' })
    }
  } catch (error) {
    console.error('[v0] Provider router failed:', error)
    return NextResponse.json({ error: 'অনুরোধটি সম্পন্ন করা যাচ্ছে না। আবার চেষ্টা ���রুন।' }, { status: 503 })
  }
}
