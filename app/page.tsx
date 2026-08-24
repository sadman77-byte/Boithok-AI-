'use client'

import { useMemo, useState } from 'react'
import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Languages,
  Menu,
  MessageSquarePlus,
  Moon,
  Paperclip,
  PanelRight,
  Plus,
  Search,
  Sparkles,
  Sun,
  Upload,
  X,
} from 'lucide-react'

const assistants = [
  ['Boithok Quick', 'Fast answers for everyday work', 'B'],
  ['Boithok Reason', 'Careful logic and step-by-step thinking', 'R'],
  ['Boithok Write', 'Clear writing, editing, and tone', 'W'],
  ['Boithok Code', 'Build, debug, and explain software', 'C'],
  ['Boithok Study', 'Learn difficult topics simply', 'S'],
  ['Boithok Translate', 'Natural multilingual translation', 'T'],
  ['Boithok Vision', 'Understand images and screenshots', 'V'],
  ['Boithok Research', 'Organize findings and sources', 'R'],
  ['Boithok Math', 'Reliable calculations and formulas', 'M'],
  ['Boithok Plan', 'Turn goals into practical plans', 'P'],
  ['Boithok Summarize', 'Compress long text into essentials', 'S'],
  ['Boithok Tutor', 'Patient guidance and practice', 'T'],
  ['Boithok Analyst', 'Patterns, data, and decisions', 'A'],
  ['Boithok Creative', 'Ideas, concepts, and direction', 'C'],
  ['Boithok Email', 'Short, polished professional emails', 'E'],
  ['Boithok Legal', 'Plain-language document review', 'L'],
  ['Boithok Career', 'CVs, interviews, and next steps', 'C'],
  ['Boithok Product', 'Product thinking and prioritization', 'P'],
  ['Boithok Marketing', 'Messaging, campaigns, and growth', 'M'],
  ['Boithok Data', 'Tables, cleanup, and insights', 'D'],
  ['Boithok Scholar', 'Academic structure and citations', 'S'],
  ['Boithok Stories', 'Narrative, scripts, and scenes', 'S'],
  ['Boithok Designer', 'UX critique and interface ideas', 'D'],
  ['Boithok Coach', 'Accountability and momentum', 'C'],
  ['Boithok Notes', 'Meetings, tasks, and memory', 'N'],
  ['Boithok SQL', 'Queries and database reasoning', 'Q'],
  ['Boithok Python', 'Python-first coding help', 'P'],
  ['Boithok Docs', 'Reports, briefs, and documentation', 'D'],
  ['Boithok Debate', 'Balanced perspectives and counterpoints', 'D'],
  ['Boithok Simplify', 'Make anything easier to understand', 'S'],
]

const starterPrompts = ['Explain something clearly', 'Translate a PDF', 'Help me plan a project']

type Message = { role: 'user' | 'assistant'; text: string }

export default function Page() {
  const [selected, setSelected] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [tool, setTool] = useState<'chat' | 'translate'>('chat')
  const [dark, setDark] = useState(true)
  const [attachments, setAttachments] = useState<File[]>([])
  const [pdfName, setPdfName] = useState('')
  const [translated, setTranslated] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [provider, setProvider] = useState('Public-first AI')

  const filtered = useMemo(() => assistants.filter(([name, desc]) => `${name} ${desc}`.toLowerCase().includes(query.toLowerCase())), [query])

  async function send(text = input) {
    const prompt = text.trim()
    if ((!prompt && attachments.length === 0) || chatLoading) return

    const attachmentContext = attachments.length > 0 ? `\n\nAttached files for analysis: ${attachments.map((file) => `${file.name} (${file.type || 'unknown type'})`).join(', ')}. Explain what can be learned from these files and ask for no unnecessary repetition.` : ''
    const userMessage: Message = { role: 'user', text: `${prompt}${attachmentContext}` }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setChatLoading(true)

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 28000)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, assistant: assistants[selected][0] }),
        signal: controller.signal,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Request failed')
      setProvider(data.provider || 'Public-first AI')
      setMessages((current) => [...current, { role: 'assistant', text: data.text }])
    } catch (error) {
      console.error('[v0] Chat request failed:', error)
      const message = error instanceof DOMException && error.name === 'AbortError'
        ? 'উত্তর আসতে বেশি সময় লাগছে। আবার পাঠালে নতুন করে চেষ্টা হবে।'
        : error instanceof Error ? error.message : 'The assistant is temporarily unavailable.'
      setMessages((current) => [...current, { role: 'assistant', text: message }])
    } finally {
      window.clearTimeout(timeout)
      setChatLoading(false)
    }
  }

  return (
    <div className={dark ? 'app-shell dark' : 'app-shell'}>
      <aside className="rail">
        <div className="brand-mark" aria-label="Boithok AI">B</div>
        <nav className="rail-nav" aria-label="Primary navigation">
          <button className="rail-button active" onClick={() => setTool('chat')} aria-label="Chat"><MessageSquarePlus /></button>
          <button className="rail-button" onClick={() => setTool('translate')} aria-label="PDF translation"><Languages /></button>
        </nav>
        <div className="rail-bottom">
          <button className="rail-button" onClick={() => setDark((value) => !value)} aria-label="Toggle theme">{dark ? <Sun /> : <Moon />}</button>
          <div className="avatar">SA</div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark small">B</div><span>Boithok AI</span></div>
          <button className="model-trigger" onClick={() => setPickerOpen((value) => !value)} aria-expanded={pickerOpen}>
            <span className="model-dot">{assistants[selected][2]}</span>
            <span><strong>{assistants[selected][0]}</strong><small>Free assistant</small></span>
            <ChevronDown />
          </button>
          <div className="top-actions"><span className="provider-status" title="Public-first routing">{provider}</span><button className="icon-button" aria-label="Menu"><Menu /></button><button className="icon-button" aria-label="Toggle panel"><PanelRight /></button></div>
          {pickerOpen && <div className="picker-popover">
            <div className="picker-heading"><div><strong>Choose an assistant</strong><small>30 free assistants · one active model</small></div><button className="icon-button" onClick={() => setPickerOpen(false)} aria-label="Close"><X /></button></div>
            <label className="search-box"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assistants" /></label>
            <div className="assistant-list">{filtered.map(([name, desc, letter], index) => { const realIndex = assistants.findIndex(([item]) => item === name); return <button className={`assistant-row ${selected === realIndex ? 'selected' : ''}`} key={name} onClick={() => { setSelected(realIndex); setPickerOpen(false) }}><span className="model-dot">{letter}</span><span><strong>{name}</strong><small>{desc}</small></span>{selected === realIndex && <Check />}</button> })}</div>
          </div>}
        </header>

        <section className="chat-area">
          {messages.length === 0 ? <div className="welcome"><div className="welcome-icon"><Sparkles /></div><p className="eyebrow">BOITHOK AI · FREE FOREVER WORKSPACE</p><h1>What can we make<br /><em>clearer</em> today?</h1><p className="welcome-copy">Thirty focused assistants for thinking, writing, translating, and creating. Built to stay useful through 2050.</p><div className="starter-grid">{starterPrompts.map((prompt) => <button key={prompt} onClick={() => { setInput(prompt); setTool(prompt === 'Translate a PDF' ? 'translate' : 'chat') }}>{prompt}<ArrowUp /></button>)}</div></div> : <div className="transcript">{messages.map((message, index) => <div className={`message ${message.role}`} key={`${message.role}-${index}`}><span className="message-label">{message.role === 'user' ? 'You' : assistants[selected][0]}</span><p>{message.text}</p>{message.role === 'assistant' && <button className="copy-button" onClick={() => navigator.clipboard?.writeText(message.text)}><Copy /> Copy</button>}</div>)}{chatLoading && <div className="message assistant"><span className="message-label">{assistants[selected][0]}</span><p>Thinking…</p></div>}</div>}

          {tool === 'translate' && <div className="tool-card"><div className="tool-card-header"><div className="tool-icon"><FileText /></div><div><h2>Translate a PDF</h2><p>Keep structure, change the language.</p></div></div><label className="upload-zone"><Upload /><strong>{pdfName || 'Drop a PDF here'}</strong><small>or choose a file · up to 25 MB</small><input type="file" accept="application/pdf" onChange={(event) => setPdfName(event.target.files?.[0]?.name || '')} /></label><div className="language-row"><label>From<select><option>Auto-detect</option><option>English</option><option>বাংলা</option></select></label><span>→</span><label>To<select><option>বাংলা</option><option>English</option><option>Español</option></select></label></div><button className="primary-button" disabled={!pdfName} onClick={() => setTranslated(true)}>{translated ? 'Translation ready' : 'Translate PDF'}<Languages /></button></div>}
          <div className="composer-wrap">{attachments.length > 0 && <div className="attachment-list" aria-label="Attached files">{attachments.map((file) => <span key={`${file.name}-${file.lastModified}`} className="attachment-chip">{file.type.startsWith('image/') ? 'Image' : file.type.startsWith('audio/') ? 'Audio' : 'PDF'} · {file.name}<button type="button" onClick={() => setAttachments((current) => current.filter((item) => item !== file))} aria-label={`Remove ${file.name}`}>×</button></span>)}</div>}<div className="composer"><label className="composer-icon" aria-label="Attach image, audio, or PDF"><Paperclip /><input className="attachment-input" type="file" accept="image/*,audio/*,application/pdf" multiple onChange={(event) => setAttachments(Array.from(event.target.files || []))} /></label><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); send() } }} placeholder={tool === 'translate' ? 'Add a PDF above to begin…' : tool === 'image' ? 'Describe the image you want…' : `Message ${assistants[selected][0]}…`} rows={1} /><button className="send-button" onClick={() => send()} aria-label="Send message"><ArrowUp /></button></div><p className="composer-note">Boithok can make mistakes. Check important information.</p></div>
        </section>
      </main>
    </div>
  )
}
