'use client'

import { useMemo, useState } from 'react'

const books = [
  { id: 1, type: 'ফিকশন', title: 'পথের পাঁচালী', author: 'বিভূতিভূষণ বন্দ্যোপাধ্যায়', year: '১৯২৯', tag: 'ক্লাসিক', open: true, color: '#c98964', mark: 'প' },
  { id: 2, type: 'গবেষণা', title: 'The Nature of Space and Time', author: 'Stephen Hawking & Roger Penrose', year: '১৯৯৬', tag: 'পদার্থবিজ্ঞান', open: true, color: '#5f93a4', mark: 'N' },
  { id: 3, type: 'নন-ফিকশন', title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', year: '২০১১', tag: 'ইতিহাস', open: false, color: '#827caa', mark: 'S' },
  { id: 4, type: 'গবেষণা', title: 'বাংলা ভাষার বিবর্তন', author: 'ড. মুহম্মদ শহীদুল্লাহ', year: '১৯৬৫', tag: 'ভাষাতত্ত্ব', open: true, color: '#b58a53', mark: 'ভা' },
  { id: 5, type: 'ফিকশন', title: 'নির্ঝরের স্বপ্নভঙ্গ', author: 'রবীন্দ্রনাথ ঠাকুর', year: '১৮৯৯', tag: 'কবিতা', open: true, color: '#7c9b78', mark: 'ন' },
  { id: 6, type: 'নন-ফিকশন', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', year: '২০১১', tag: 'মনোবিজ্ঞান', open: false, color: '#a987a8', mark: 'T' },
]

const tabs = ['সব', 'ফিকশন', 'নন-ফিকশন', 'গবেষণা']

const normalizeSearch = (value: string) => value
  .normalize('NFKC')
  .toLocaleLowerCase('bn-BD')
  .replace(/[–—-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export default function Home() {
  const [activeTab, setActiveTab] = useState('সব')
  const [query, setQuery] = useState('')
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [saved, setSaved] = useState<number[]>([])

  const normalizedQuery = normalizeSearch(query)
  const filtered = useMemo(() => books.filter((book) => {
    const searchableText = normalizeSearch(`${book.type} ${book.title} ${book.author} ${book.tag} ${book.year}`)
    const matchesTab = activeTab === 'সব' || book.type === activeTab
    const queryTerms = normalizedQuery.split(' ').filter(Boolean)
    const matchesQuery = queryTerms.length === 0 || queryTerms.every((term) => searchableText.includes(term))
    const matchesOpen = !onlyOpen || book.open
    return matchesTab && matchesQuery && matchesOpen
  }), [activeTab, normalizedQuery, onlyOpen])

  const toggleSaved = (id: number) => setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  return (
    <main className="site-shell">
      <header className="topbar">
        <a href="#top" className="brand" aria-label="জ্ঞানের সমুদ্র হোমপেজ">
          <span className="brand-mark">জ</span>
          <span><strong>জ্ঞানের সমুদ্র</strong><small>একটি মুক্ত ডিজিটাল গ্রন্থাগার</small></span>
        </a>
        <nav className="nav-links" aria-label="প্রধান নেভিগেশন">
          <a href="#library">লাইব্রেরি</a>
          <a href="#about">আমাদের কথা</a>
          <a href="#roadmap">রোডম্যাপ</a>
        </nav>
        <div className="top-actions"><button className="icon-button" aria-label="ভাষা পরিবর্তন">অ/আ</button><button className="outline-button">লগইন</button><button className="menu-button" aria-label="মেনু">☰</button></div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" />জ্ঞান সবার জন্য, বিনামূল্যে</div>
          <h1>জানার কোনো শেষ নেই,<br /><em>শুরু হোক আজই।</em></h1>
          <p>বাংলা ও বিশ্বের সেরা বই, গবেষণা এবং চিন্তার সংগ্রহ—একটি জায়গায়, সবার নাগালের মধ্যে।</p>
          <form className="hero-search" role="search" onSubmit={(event) => { event.preventDefault(); document.querySelector('#library')?.scrollIntoView({ behavior: 'smooth' }) }}><span aria-hidden="true">⌕</span><input aria-label="বই বা গবেষণা খুঁজুন" placeholder="বই, লেখক বা বিষয় খুঁজুন..." value={query} onChange={(event) => setQuery(event.target.value)} /><button className="search-submit" type="submit">খুঁজুন</button><kbd>⌘ K</kbd></form>
          <div className="hero-meta"><span><b>৪,২৮,৬১৯</b>+ বই ও পেপার</span><span className="meta-separator" /><span><b>৬৮</b>টি ভাষা</span><span className="meta-separator" /><span><b>১০০%</b> বিনামূল্যে</span></div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="globe"><span className="globe-line line-one" /><span className="globe-line line-two" /><span className="globe-line line-three" /></div><div className="floating-card card-top"><span className="mini-icon">✦</span><span><b>আজকের নতুন</b><small>২,৪৩০টি কন্টেন্ট যোগ হয়েছে</small></span></div><div className="floating-card card-bottom"><span className="pulse">●</span><span><b>আপনার জ্ঞানের যাত্রা</b><small>আজ ১২ মিনিট পড়েছেন</small></span></div></div>
      </section>

      <section className="content-section" id="library">
        <div className="section-heading"><div><span className="section-kicker">আপনার জন্য বাছাই</span><h2>আজ কী পড়বেন?</h2></div><a href="#library" className="text-link">সব দেখুন <span>→</span></a></div>
        <div className="filter-row"><div className="tabs" role="tablist">{tabs.map((tab) => <button key={tab} className={activeTab === tab ? 'tab active' : 'tab'} onClick={() => setActiveTab(tab)} role="tab" aria-selected={activeTab === tab}>{tab}</button>)}</div><button className={onlyOpen ? 'open-filter selected' : 'open-filter'} onClick={() => setOnlyOpen(!onlyOpen)}><span>◉</span> শুধু ওপেন অ্যাক্সেস</button></div>
        <div className="book-grid">{filtered.map((book) => <article className="book-card" key={book.id}><div className="book-cover" style={{ background: `linear-gradient(140deg, ${book.color}, #172033)` }}><span className="cover-type">{book.type}</span><span className="cover-mark">{book.mark}</span><span className="cover-year">{book.year}</span></div><div className="book-info"><div className="book-title-row"><div><h3>{book.title}</h3><p>{book.author}</p></div><button className={saved.includes(book.id) ? 'bookmark saved' : 'bookmark'} onClick={() => toggleSaved(book.id)} aria-label={`${book.title} বুকমার্ক করুন`}>{saved.includes(book.id) ? '★' : '☆'}</button></div><div className="book-footer"><span className="book-tag">{book.tag}</span>{book.open ? <span className="open-badge">ওপেন অ্যাক্সেস</span> : <span className="read-badge">প্রিভিউ</span>}</div></div></article>)}</div>{filtered.length === 0 && <div className="empty-state"><p>আপনার খোঁজের সঙ্গে মেলে এমন কোনো কন্টেন্ট পাওয়া যায়নি।</p><small>শিরোনাম, লেখক বা বিষয়ের একটি শব্দ দিয়ে আবার চেষ্টা করুন।</small><button type="button" onClick={() => { setQuery(''); setActiveTab('সব'); setOnlyOpen(false) }}>সব কন্টেন্ট দেখুন</button></div>}
      </section>

      <section className="trust-strip" id="about"><div className="trust-intro"><span className="section-kicker">ব���শ্বস্ত উৎস</span><p>আপনার জ্ঞানযাত্রায়<br />আমাদের সঙ্গী</p></div><div className="source-list"><span>openstax</span><span>PROJECT<br /><b>GUTENBERG</b></span><span>arXiv</span><span>DOAJ</span><span>বাংলা<br /><b>একাডেমি</b></span></div></section>

      <section className="roadmap" id="roadmap"><div><span className="section-kicker">আমাদের স্বপ্ন</span><h2>জ্ঞানকে পৌঁছে দিতে চাই<br /><em>প্রতিটি মানুষের কাছে।</em></h2><p>আজকের এই ছোট্ট শুরু, আগামী দিনের এক বিশাল সংগ্রহ। আপনার সহযোগিতায় ২০৫৫ সালের মধ্যে আমরা তৈরি করব বিশ্বের সবচেয়ে বড় মুক্ত জ্ঞানভাণ্ডার।</p><button className="primary-button">আমাদের গল্প জানুন <span>→</span></button></div><div className="roadmap-stat"><strong>৯০ লক্ষ</strong><span>কন্টেন্টের লক্ষ্য</span><div className="progress"><span /></div><small>এখন পর্যন্ত ৪,২৮,৬১৯ সংগ্রহিত</small><div className="year-line"><span>২০২৪</span><i /><span>২০৫৫</span></div></div></section>
      <footer><a href="#top" className="brand"><span className="brand-mark">জ</span><span><strong>জ্ঞানের সমুদ্র</strong><small>জ্ঞান সবার অধিকার</small></span></a><p>© ২০২৪ জ্ঞানের সমুদ্র · একটি অলাভজনক উদ্যোগ</p><div><a href="#about">গোপনীয়তা</a><a href="#about">যোগাযোগ</a></div></footer>
    </main>
  )
}
