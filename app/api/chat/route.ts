import { NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
const TIMEOUT_MS = 18000
const REQUEST_TIMEOUT_MS = 22000
const MAX_CONTEXT_MESSAGES = 8
const MAX_MESSAGE_CHARS = 6000

type ChatMessage = { role: 'system' | 'assistant'; content: string } | { role: 'user'; content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> }
type Attachment = { name: string; type: string; data: string }
type ProviderResult = { text: string; provider: string }

async function readJsonResponse(response: Response): Promise<Record<string, any>> {
  const raw = await response.text()
  if (!raw.trim()) return { _error: 'empty-response' }
  try { return JSON.parse(raw) } catch { return { _error: raw.slice(0, 500) } }
}

function decodeDataUrl(data: string) {
  const match = data.match(/^data:([^;]+);base64,(.+)$/s)
  if (!match) throw new Error('attachment:invalid-data-url')
  return { type: match[1], buffer: Buffer.from(match[2], 'base64') }
}

async function parseAttachment(file: Attachment) {
  const decoded = decodeDataUrl(file.data)
  if (file.type === 'application/pdf' || decoded.type === 'application/pdf') {
    const parser = new PDFParse({ data: decoded.buffer })
    try {
      const result = await parser.getText()
      return `[PDF: ${file.name}]\\n${result.text.slice(0, 30000)}`
    } finally { await parser.destroy() }
  }
  if (file.type.startsWith('audio/') || decoded.type.startsWith('audio/')) {
    const token = process.env.HF_TOKEN
    if (!token) return `[Audio: ${file.name}] Transcription unavailable because HF_TOKEN is not configured.`
    const response = await fetch('https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3-turbo', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type },
      body: decoded.buffer, signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const result = await readJsonResponse(response)
    if (!response.ok || typeof result?.text !== 'string') throw new Error(`audio-transcription:${response.status}`)
    return `[Audio transcription: ${file.name}]\\n${result.text.slice(0, 20000)}`
  }
  return ''
}

async function openRouterChat(messages: ChatMessage[]): Promise<ProviderResult> {
  const configuredSecret = process.env.SECRET_2
  const configuredHost = process.env.HOST_2
  const secret = configuredSecret && !configuredSecret.startsWith('process.env.') && configuredSecret !== 'secret' ? configuredSecret : ''
  const host = configuredHost && !configuredHost.startsWith('process.env.') && configuredHost !== 'localhost' ? configuredHost : 'https://openrouter.ai'
  if (!secret) throw new Error('openrouter:missing-api-key')
  const base = /^https?:\/\//i.test(host) ? host.replace(/\/$/, '') : `https://${host}`
  const endpoint = /\/api\/v1$/i.test(base) ? `${base}/chat/completions` : `${base}/api/v1/chat/completions`
  const hasImage = messages.some((message) => Array.isArray(message.content) && message.content.some((part) => part.type === 'image_url'))
  const model = hasImage ? 'openrouter/free' : 'openrouter/free'
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}`, 'HTTP-Referer': 'https://boithok-ai.vercel.app', 'X-Title': 'Boithok AI' },
    body: JSON.stringify({ model, temperature: 0.7, max_tokens: 1200, messages }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const data = await readJsonResponse(response)
  const text = data?.choices?.[0]?.message?.content
  if (!response.ok || typeof text !== 'string' || !text.trim()) throw new Error(`openrouter:${response.status}:${data?.error?.message || 'empty-response'}`)
  return { text: text.trim(), provider: 'OpenRouter Free' }
}

async function pollinationsChat(messages: ChatMessage[]): Promise<ProviderResult> {
  const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'openai', temperature: 0.7, max_tokens: 1200, messages }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const data = await readJsonResponse(response)
  const text = data?.choices?.[0]?.message?.content
  if (!response.ok || typeof text !== 'string' || !text.trim()) throw new Error(`pollinations-gen:${response.status}`)
  return { text: text.trim(), provider: 'Pollinations' }
}

async function pollinationsFree(messages: ChatMessage[]): Promise<ProviderResult> {
  const prompt = messages.filter((message) => message.role !== 'system').map((message) => {
    if (typeof message.content === 'string') return `${message.role}: ${message.content}`
    return `${message.role}: ${message.content.filter((part) => part.type === 'text').map((part) => part.text).join(' ')}`
  }).join('\\n')
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
    const hasImage = messages.some((message) => Array.isArray(message.content) && message.content.some((part) => part.type === 'image_url'))
    const models = hasImage
      ? [process.env.HF_VISION_MODEL, 'Qwen/Qwen2.5-VL-7B-Instruct', 'google/gemma-3-27b-it']
      : [process.env.HF_MODEL, 'Qwen/Qwen3-4B-Instruct-2507', 'meta-llama/Llama-3.1-8B-Instruct', 'openai/gpt-oss-20b']
    const availableModels = models.filter(Boolean) as string[]
  let lastError = 'empty-response'
  for (const model of availableModels) {
    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ model, temperature: 0.7, max_tokens: 1200, messages }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const data = await readJsonResponse(response)
    const text = data?.choices?.[0]?.message?.content
    if (response.ok && typeof text === 'string' && text.trim()) return { text: text.trim(), provider: `Hugging Face · ${model.split('/').pop()}` }
    lastError = `${response.status}:${data?.error?.message || 'empty-response'}`
    if (response.status !== 400) break
  }
  throw new Error(`huggingface:${lastError}`)
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    if (!rawBody.trim()) return NextResponse.json({ error: 'Empty request body.' }, { status: 400 })
    let body: { messages?: Array<{ role: 'user' | 'assistant'; text: string }>; assistant?: string; attachments?: Attachment[] }
    try { body = JSON.parse(rawBody) } catch { return NextResponse.json({ error: 'Invalid request JSON.' }, { status: 400 }) }
    const { messages, assistant, attachments = [] } = body
    if (!Array.isArray(messages) || messages.length === 0) return NextResponse.json({ error: 'A message is required.' }, { status: 400 })
    if (rawBody.length > 6_000_000) return NextResponse.json({ error: 'The request is too large. Keep attachments within the upload limits.' }, { status: 413 })

    const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES)
    const safeAttachments = (Array.isArray(attachments) ? attachments : []).filter((file) => typeof file?.data === 'string' && file.data.length < 12_000_000).slice(0, 3).map((file) => {
      const detectedType = file.type || file.data.match(/^data:([^;]+);/)?.[1] || 'application/octet-stream'
      return { ...file, type: detectedType }
    })
    const parsedText = (await Promise.all(safeAttachments.map(async (file) => { try { return await parseAttachment(file) } catch (error) { console.warn('[v0] Attachment parsing failed:', file.name, error); return `[${file.name}] Parsing failed: ${error instanceof Error ? error.message : 'unsupported file'}` } }))).filter(Boolean).join('\\n\\n')
    const lastUser = recentMessages.findLast((message) => message.role === 'user')
    const userContent: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [{ type: 'text', text: `${String(lastUser?.text || '').slice(0, MAX_MESSAGE_CHARS)}${parsedText ? `\\n${parsedText}` : ''}${safeAttachments.some((file) => file.type.startsWith('image/')) ? '\\nThe image is attached as actual image data. Inspect it directly and answer the user using only visible evidence.' : ''}` }]
    for (const file of safeAttachments) {
      if (file.type.startsWith('image/')) userContent.push({ type: 'image_url', image_url: { url: file.data } })
    }
    const baseMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT(assistant) },
      ...recentMessages.slice(0, -1).map((message) => ({ role: message.role, content: String(message.text).slice(0, MAX_MESSAGE_CHARS) })),
    ]
    const hasImageAttachment = safeAttachments.some((file) => file.type.startsWith('image/'))
    const chatMessages: ChatMessage[] = lastUser
      ? [...baseMessages, { role: 'user' as const, content: hasImageAttachment ? userContent : `${userContent[0].text || ''}` }]
      : baseMessages

    // Run OpenRouter and Hugging Face concurrently; first valid response wins.
    const providers = [
      openRouterChat,
      ...(process.env.HF_TOKEN ? [huggingFaceChat] : []),
      ...(hasImageAttachment ? [] : [pollinationsChat, pollinationsFree]),
    ]

    try {
      const result = await Promise.race([
        Promise.any(providers.map((provider) => provider(chatMessages))),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('provider-timeout')), REQUEST_TIMEOUT_MS)),
      ])
      return NextResponse.json(result)
    } catch (error) {
      console.warn('[v0] All AI providers failed:', error)
      const latest = String(recentMessages[recentMessages.length - 1]?.text || '').trim()
      const isBengali = /[\u0980-\u09ff]/.test(latest)
      const isGreeting = /^(হাই|হ্যালো|আসসালামু আলাইকুম|কেমন আছিস|কেমন আছো|কেমন আছেন|hi|hello|hey)\b/i.test(latest)
      const hasImage = safeAttachments.some((file) => file.type.startsWith('image/'))
      const hasPdf = safeAttachments.some((file) => file.type === 'application/pdf')
      const hasAudio = safeAttachments.some((file) => file.type.startsWith('audio/'))
      const fallback = safeAttachments.length > 0
        ? `তোর ফাইলটি সংযুক্ত হয়েছে, কিন্তু বিশ্লেষণ মডেল থেকে নির্ভরযোগ্য উত্তর পাওয়া যায়নি। ফাইলটি আবার পাঠানোর দরকার নেই; কিছুক্ষণ পরে একই প্রশ্নে আবার চেষ্টা করো।`
        : hasPdf
          ? 'তুই কোনো PDF দিচ্ছিস না। PDF ফাইলটি সংযুক্ত করে আবার প্রশ্নটি পাঠা।'
          : hasAudio
            ? 'তুই কোনো অডিও দিচ্ছিস না। অডিও ফাইলটি সংযুক্ত করে আবার প্রশ্নটি পাঠা।'
            : isBengali
              ? isGreeting
                ? 'ভালো আছি রে। তুই কেমন আছিস? কী নিয়ে কথা বলবি?'
                : `তোর কথাটা পেয়েছি: “${latest}”। এই মুহূর্তে বাইরের মডেলগুলো সাড়��� দিচ্ছে না। একটু পর আবার চেষ্টা করো।`
        : isGreeting
          ? 'I’m doing well. What would you like to work on?'
          : `I received your message: “${latest}”. The external models are not responding right now, so I won’t invent an answer. Please try again shortly.`
      return NextResponse.json({ text: fallback, provider: 'Boithok safe fallback' })
    }
  } catch (error) {
    console.error('[v0] Provider router failed:', error)
    return NextResponse.json({ error: 'অনুরোধটি সম্পন্ন করা যাচ্ছে না। আবার চেষ��টা করুন।' }, { status: 503 })
  }
}
