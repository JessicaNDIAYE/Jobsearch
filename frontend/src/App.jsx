import { useState, useEffect, useCallback, useRef } from 'react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API = 'http://localhost:5000/api'

const STATUS_META = {
  saved:     { label: 'Saved',     color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  applied:   { label: 'Applied',   color: '#F97316', bg: 'rgba(249,115,22,0.15)' },
  interview: { label: 'Interview', color: '#22C55E', bg: 'rgba(34,197,94,0.15)'  },
  offer:     { label: 'Offer',     color: '#A855F7', bg: 'rgba(168,85,247,0.15)' },
  rejected:  { label: 'Rejected',  color: '#EF4444', bg: 'rgba(239,68,68,0.15)'  },
}

const COMPANY_TYPES = [
  'PME', 'Scale-up', 'Startup', 'Grande entreprise',
  'Big Tech', 'Research Institute', 'ESN', 'Autre',
]

const EMPTY_JOB = {
  company: '', job_title: '', type: 'Startup', industry: '',
  location: '', status: 'saved', salary: '', job_url: '', notes: '',
}

const AI_SYSTEM_PROMPT = `You are a job search expert specializing in AI/Data Science roles for new graduates (graduating end of 2026). The user has done: 1) a web dev internship, 2) a 6-month R&D internship at Lizeo building an Agentic AI system using MCP protocol, LangChain, Flask, AWS Athena, RAG, LLM orchestration. Help find realistic junior/new-grad positions. Return ONLY a JSON array of job opportunities, no markdown, no explanation. Each object: {company, job_title, type, industry, location, notes, search_query}. Focus on: Junior Data Scientist, AI Engineer Junior, ML Engineer Junior, Data Analyst, NLP Engineer, AI Developer — NOT senior roles.`

// ---------------------------------------------------------------------------
// Palette / common styles
// ---------------------------------------------------------------------------

const P = {
  bg:       '#060d1a',
  surface:  '#0d1829',
  card:     'rgba(255,255,255,0.03)',
  border:   'rgba(255,255,255,0.07)',
  accent:   '#e94560',
  accentHover: '#ff2d55',
  text:     '#e2e8f0',
  muted:    '#64748b',
  input:    '#0d1829',
}

const css = {
  btn: (variant = 'primary', sm = false) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: sm ? '6px 14px' : '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: 600,
    fontSize: sm ? '13px' : '14px',
    transition: 'all 0.15s',
    ...(variant === 'primary' && {
      background: P.accent,
      color: '#fff',
    }),
    ...(variant === 'ghost' && {
      background: 'rgba(255,255,255,0.05)',
      color: P.text,
      border: `1px solid ${P.border}`,
    }),
    ...(variant === 'danger' && {
      background: 'rgba(239,68,68,0.15)',
      color: '#EF4444',
      border: '1px solid rgba(239,68,68,0.3)',
    }),
    ...(variant === 'success' && {
      background: 'rgba(34,197,94,0.15)',
      color: '#22C55E',
      border: '1px solid rgba(34,197,94,0.3)',
    }),
  }),
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: `1px solid ${P.border}`,
    background: P.input,
    color: P.text,
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: P.muted,
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

function getToken() { return localStorage.getItem('jt_token') }
function getUser()  {
  try { return JSON.parse(localStorage.getItem('jt_user') || 'null') }
  catch { return null }
}

async function apiFetch(path, opts = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, { ...opts, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

function StatusBadge({ status, size = 'sm' }) {
  const meta = STATUS_META[status] || STATUS_META.saved
  return (
    <span style={{
      display: 'inline-block',
      padding: size === 'sm' ? '3px 10px' : '5px 14px',
      borderRadius: '20px',
      fontSize: size === 'sm' ? '11px' : '13px',
      fontWeight: 700,
      color: meta.color,
      background: meta.bg,
      border: `1px solid ${meta.color}40`,
      whiteSpace: 'nowrap',
      letterSpacing: '0.03em',
    }}>
      {meta.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

function Modal({ open, onClose, title, children, width = 600 }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d1829',
          border: `1px solid ${P.border}`,
          borderRadius: '16px',
          width: '100%',
          maxWidth: `${width}px`,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: P.text }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: P.muted, cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// JobForm (used in Add / Edit modal)
// ---------------------------------------------------------------------------

function JobForm({ initial = EMPTY_JOB, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const row = (children, gap = 16) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: `${gap}px`, marginBottom: '16px' }}>
      {children}
    </div>
  )
  const field = (label, key, type = 'text', options = null) => (
    <div>
      <label style={css.label}>{label}</label>
      {options ? (
        <select
          value={form[key]}
          onChange={e => set(key, e.target.value)}
          style={{ ...css.input, appearance: 'none' }}
        >
          {options.map(o => (
            <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          value={form[key]}
          onChange={e => set(key, e.target.value)}
          rows={3}
          style={{ ...css.input, resize: 'vertical' }}
        />
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={e => set(key, e.target.value)}
          style={css.input}
        />
      )}
    </div>
  )

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }}>
      {row([
        field('Company', 'company'),
        field('Job Title', 'job_title'),
      ])}
      {row([
        field('Company Type', 'type', 'text', COMPANY_TYPES),
        field('Industry', 'industry'),
      ])}
      {row([
        field('Location', 'location'),
        field('Status', 'status', 'text', Object.entries(STATUS_META).map(([v, m]) => ({ value: v, label: m.label }))),
      ])}
      {row([
        field('Salary', 'salary'),
        field('Job URL', 'job_url', 'url'),
      ])}
      <div style={{ marginBottom: '24px' }}>
        {field('Notes', 'notes', 'textarea')}
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={css.btn('ghost')}>Cancel</button>
        <button type="submit" disabled={loading} style={css.btn('primary')}>
          {loading ? 'Saving…' : 'Save Job'}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// AuthPage
// ---------------------------------------------------------------------------

function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const path = mode === 'login' ? '/login' : '/register'
      const data = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(form),
      })
      localStorage.setItem('jt_token', data.token)
      localStorage.setItem('jt_user', JSON.stringify({ username: data.username, email: data.email }))
      onAuth()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: P.bg, padding: '16px',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'fixed', top: '-20%', right: '-10%', width: '600px', height: '600px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,69,96,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-20%', left: '-10%', width: '500px', height: '500px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: '420px',
        background: '#0d1829',
        border: `1px solid ${P.border}`,
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: `linear-gradient(135deg, ${P.accent}, #ff6b8a)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: `0 8px 24px rgba(233,69,96,0.35)`,
          }}>
            <span style={{ fontSize: '24px' }}>🎯</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: P.text, letterSpacing: '-0.02em' }}>
            Job<span style={{ color: P.accent }}>Tracker</span>
          </h1>
          <p style={{ color: P.muted, fontSize: '14px', marginTop: '6px' }}>
            {mode === 'login' ? 'Welcome back 👋' : 'Start tracking your dream job 🚀'}
          </p>
        </div>

        {/* Toggle */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.04)',
          borderRadius: '10px', padding: '4px', marginBottom: '24px',
        }}>
          {['login', 'register'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              style={{
                flex: 1, padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
                transition: 'all 0.2s',
                background: mode === m ? P.accent : 'transparent',
                color: mode === m ? '#fff' : P.muted,
              }}
            >
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={css.label}>Username</label>
              <input
                value={form.username} onChange={e => set('username', e.target.value)}
                placeholder="your_name" required style={css.input}
              />
            </div>
          )}
          <div style={{ marginBottom: '16px' }}>
            <label style={css.label}>Email</label>
            <input
              type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="you@email.com" required style={css.input}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={css.label}>Password</label>
            <input
              type="password" value={form.password} onChange={e => set('password', e.target.value)}
              placeholder="••••••••" required style={css.input}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', padding: '10px 14px', marginBottom: '16px',
              color: '#EF4444', fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{ ...css.btn('primary'), width: '100%', justifyContent: 'center', padding: '12px' }}
          >
            {loading ? 'Loading…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatsBar
// ---------------------------------------------------------------------------

function StatsBar({ stats }) {
  if (!stats) return null
  const items = [
    { label: 'Total', value: stats.total, color: P.accent },
    ...Object.entries(STATUS_META).map(([k, m]) => ({
      label: m.label, value: stats.by_status?.[k] || 0, color: m.color,
    })),
  ]
  return (
    <div style={{
      display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px',
    }}>
      {items.map(item => (
        <div key={item.label} style={{
          flex: '1 1 100px', minWidth: '90px',
          background: '#0d1829',
          border: `1px solid ${P.border}`,
          borderRadius: '12px',
          padding: '16px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
            background: item.color,
          }} />
          <div style={{ fontSize: '28px', fontWeight: 800, color: item.color, lineHeight: 1 }}>
            {item.value}
          </div>
          <div style={{ fontSize: '12px', color: P.muted, marginTop: '4px', fontWeight: 500 }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// JobsTable
// ---------------------------------------------------------------------------

function JobsTable({ jobs, onEdit, onDelete, search }) {
  const filtered = jobs.filter(j => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (j.company || '').toLowerCase().includes(q) ||
      (j.job_title || '').toLowerCase().includes(q) ||
      (j.location || '').toLowerCase().includes(q) ||
      (j.industry || '').toLowerCase().includes(q) ||
      (j.status || '').toLowerCase().includes(q)
    )
  })

  const [hoveredRow, setHoveredRow] = useState(null)

  if (filtered.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '60px 20px',
        color: P.muted, fontSize: '15px',
      }}>
        {jobs.length === 0
          ? 'No jobs yet. Click "+ Add Job" to get started!'
          : 'No jobs match your search.'}
      </div>
    )
  }

  const tdStyle = {
    padding: '12px 16px',
    fontSize: '13px',
    color: P.text,
    borderBottom: `1px solid ${P.border}`,
    verticalAlign: 'middle',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }

  const thStyle = {
    padding: '10px 16px',
    fontSize: '11px',
    fontWeight: 700,
    color: P.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: `1px solid ${P.border}`,
    textAlign: 'left',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: '12px', border: `1px solid ${P.border}` }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
            <th style={thStyle}>Company</th>
            <th style={thStyle}>Job Title</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Location</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Salary</th>
            <th style={{ ...thStyle, maxWidth: '180px' }}>Notes</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((job, i) => (
            <tr
              key={job.id}
              onMouseEnter={() => setHoveredRow(job.id)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                background: hoveredRow === job.id ? 'rgba(255,255,255,0.04)' : (i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'),
                transition: 'background 0.12s',
                cursor: 'pointer',
              }}
              onClick={() => onEdit(job)}
            >
              <td style={{ ...tdStyle, fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                    background: `linear-gradient(135deg, ${stringToColor(job.company)}, ${stringToColor(job.company + '2')})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: '#fff',
                  }}>
                    {(job.company || '?')[0].toUpperCase()}
                  </div>
                  {job.company || '—'}
                </div>
              </td>
              <td style={tdStyle}>{job.job_title || '—'}</td>
              <td style={{ ...tdStyle, color: P.muted }}>{job.type || '—'}</td>
              <td style={{ ...tdStyle, color: P.muted }}>
                {job.location ? `📍 ${job.location}` : '—'}
              </td>
              <td style={tdStyle}><StatusBadge status={job.status} /></td>
              <td style={{ ...tdStyle, color: P.muted }}>{job.salary || '—'}</td>
              <td style={{ ...tdStyle, color: P.muted, maxWidth: '180px' }}>
                <span title={job.notes}>{job.notes ? job.notes.substring(0, 50) + (job.notes.length > 50 ? '…' : '') : '—'}</span>
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                  {job.job_url && (
                    <a
                      href={job.job_url} target="_blank" rel="noopener noreferrer"
                      style={{ ...css.btn('ghost', true), textDecoration: 'none' }}
                      title="Open URL"
                    >🔗</a>
                  )}
                  <button onClick={() => onEdit(job)} style={css.btn('ghost', true)}>Edit</button>
                  <button onClick={() => onDelete(job.id)} style={css.btn('danger', true)}>Del</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function stringToColor(str = '') {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#e94560', '#3B82F6', '#22C55E', '#F97316', '#A855F7', '#EC4899', '#14B8A6']
  return colors[Math.abs(hash) % colors.length]
}

// ---------------------------------------------------------------------------
// AITab
// ---------------------------------------------------------------------------

function AITab({ onSaveJob }) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || ''
  const [keywords, setKeywords] = useState('Junior Data Scientist AI Engineer')
  const [location, setLocation] = useState('Lyon, France')
  const [level, setLevel] = useState('junior')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedIds, setSavedIds] = useState(new Set())

  const search = async () => {
    if (!apiKey) {
      setError('VITE_ANTHROPIC_API_KEY not set. Add it to frontend/.env')
      return
    }
    setLoading(true)
    setError('')
    setResults([])
    try {
      const userMsg = `Find ${level} job opportunities for: ${keywords}. Location preference: ${location}. Return JSON array only.`
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          system: AI_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMsg }],
        }),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error?.message || 'API error')
      }
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const jobs = JSON.parse(text)
      if (!Array.isArray(jobs)) throw new Error('Invalid response format')
      setResults(jobs)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const saveJob = async (job, idx) => {
    try {
      await onSaveJob({
        company: job.company || '',
        job_title: job.job_title || '',
        type: job.type || 'Startup',
        industry: job.industry || '',
        location: job.location || '',
        notes: `${job.notes || ''}\n\nSearch: ${job.search_query || ''}`.trim(),
        job_url: '',
        salary: '',
        status: 'saved',
      })
      setSavedIds(s => new Set([...s, idx]))
    } catch (err) {
      alert('Failed to save: ' + err.message)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(233,69,96,0.1), rgba(168,85,247,0.08))',
        border: `1px solid rgba(233,69,96,0.2)`,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '28px' }}>🤖</span>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: P.text }}>AI Job Finder</h2>
            <p style={{ color: P.muted, fontSize: '13px' }}>Powered by Claude — finds tailored junior AI/Data positions</p>
          </div>
        </div>
        {!apiKey && (
          <div style={{
            background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)',
            borderRadius: '8px', padding: '10px 14px', marginTop: '12px',
            color: '#F97316', fontSize: '13px',
          }}>
            ⚠️ Set <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>VITE_ANTHROPIC_API_KEY</code> in <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>frontend/.env</code> to use AI features.
          </div>
        )}
      </div>

      {/* Search form */}
      <div style={{
        background: '#0d1829', border: `1px solid ${P.border}`,
        borderRadius: '12px', padding: '20px', marginBottom: '24px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={css.label}>Keywords / Roles</label>
            <input
              value={keywords} onChange={e => setKeywords(e.target.value)}
              placeholder="Junior Data Scientist, AI Engineer…"
              style={css.input}
            />
          </div>
          <div>
            <label style={css.label}>Location</label>
            <input
              value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Lyon, Paris, Remote…"
              style={css.input}
            />
          </div>
          <div>
            <label style={css.label}>Level</label>
            <select
              value={level} onChange={e => setLevel(e.target.value)}
              style={{ ...css.input, appearance: 'none' }}
            >
              <option value="junior">Junior / New Grad</option>
              <option value="intern">Intern</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: '14px' }}>
          <button
            onClick={search} disabled={loading || !apiKey}
            style={{ ...css.btn('primary'), opacity: (!apiKey || loading) ? 0.5 : 1 }}
          >
            {loading ? (
              <>
                <span style={{
                  display: 'inline-block', width: '14px', height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} />
                Searching…
              </>
            ) : '✨ Find Jobs with AI'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px', padding: '12px 16px', marginBottom: '20px',
          color: '#EF4444', fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: P.muted }}>
          <div style={{
            width: '40px', height: '40px',
            border: `3px solid rgba(233,69,96,0.2)`, borderTopColor: P.accent,
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          Claude is finding the best opportunities for you…
        </div>
      )}

      {results.length > 0 && (
        <>
          <div style={{ fontSize: '14px', color: P.muted, marginBottom: '16px' }}>
            Found <strong style={{ color: P.text }}>{results.length}</strong> opportunities
          </div>
          <div style={{ display: 'grid', gap: '14px' }}>
            {results.map((job, idx) => (
              <div key={idx} style={{
                background: '#0d1829',
                border: `1px solid ${savedIds.has(idx) ? 'rgba(34,197,94,0.3)' : P.border}`,
                borderRadius: '12px',
                padding: '20px',
                transition: 'border-color 0.2s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                        background: `linear-gradient(135deg, ${stringToColor(job.company)}, ${stringToColor(job.company + '2')})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 700, color: '#fff',
                      }}>
                        {(job.company || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: P.text }}>{job.job_title}</div>
                        <div style={{ color: P.muted, fontSize: '13px' }}>{job.company}</div>
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                        background: 'rgba(168,85,247,0.15)', color: '#A855F7',
                        border: '1px solid rgba(168,85,247,0.3)',
                      }}>{job.type}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {job.location && (
                        <span style={{ color: P.muted, fontSize: '13px' }}>📍 {job.location}</span>
                      )}
                      {job.industry && (
                        <span style={{ color: P.muted, fontSize: '13px' }}>🏭 {job.industry}</span>
                      )}
                    </div>
                    {job.notes && (
                      <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 }}>{job.notes}</p>
                    )}
                    {job.search_query && (
                      <div style={{ marginTop: '8px' }}>
                        <span style={{
                          fontSize: '11px', color: P.muted,
                          background: 'rgba(255,255,255,0.04)',
                          padding: '3px 8px', borderRadius: '4px',
                        }}>
                          🔍 {job.search_query}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => saveJob(job, idx)}
                    disabled={savedIds.has(idx)}
                    style={{
                      ...css.btn(savedIds.has(idx) ? 'success' : 'primary', true),
                      flexShrink: 0,
                      opacity: savedIds.has(idx) ? 0.8 : 1,
                    }}
                  >
                    {savedIds.has(idx) ? '✓ Saved' : '+ Save'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function Dashboard({ user, onLogout }) {
  const [jobs, setJobs] = useState([])
  const [stats, setStats] = useState(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('tracker')
  const [modalOpen, setModalOpen] = useState(false)
  const [editJob, setEditJob] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [loadingJobs, setLoadingJobs] = useState(true)

  const fetchJobs = useCallback(async () => {
    try {
      const [j, s] = await Promise.all([apiFetch('/jobs'), apiFetch('/stats')])
      setJobs(j)
      setStats(s)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingJobs(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const openAdd = () => { setEditJob(null); setModalOpen(true) }
  const openEdit = (job) => { setEditJob(job); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditJob(null) }

  const saveJob = async (form) => {
    setFormLoading(true)
    try {
      if (editJob) {
        await apiFetch(`/jobs/${editJob.id}`, { method: 'PUT', body: JSON.stringify(form) })
      } else {
        await apiFetch('/jobs', { method: 'POST', body: JSON.stringify(form) })
      }
      await fetchJobs()
      closeModal()
    } catch (err) {
      alert(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const deleteJob = async (id) => {
    if (!confirm('Delete this job?')) return
    try {
      await apiFetch(`/jobs/${id}`, { method: 'DELETE' })
      await fetchJobs()
    } catch (err) {
      alert(err.message)
    }
  }

  const exportExcel = () => {
    const token = getToken()
    const a = document.createElement('a')
    a.href = `${API}/jobs/export`
    const headers = new Headers({ Authorization: `Bearer ${token}` })
    fetch(`${API}/jobs/export`, { headers })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob)
        a.href = url
        a.download = `jobtracker_${user.username}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch(err => alert('Export failed: ' + err.message))
  }

  const logout = async () => {
    try { await apiFetch('/logout', { method: 'POST' }) } catch {}
    localStorage.removeItem('jt_token')
    localStorage.removeItem('jt_user')
    onLogout()
  }

  const tabs = [
    { id: 'tracker', label: '📋 Tracker' },
    { id: 'ai', label: '🤖 AI Finder' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: P.bg }}>
      {/* Background decoration */}
      <div style={{
        position: 'fixed', top: '-10%', right: '-5%', width: '400px', height: '400px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,69,96,0.05) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(6,13,26,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${P.border}`,
        padding: '0 24px',
      }}>
        <div style={{
          maxWidth: '1280px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '60px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: `linear-gradient(135deg, ${P.accent}, #ff6b8a)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
            }}>🎯</div>
            <span style={{ fontSize: '18px', fontWeight: 800, color: P.text, letterSpacing: '-0.01em' }}>
              Job<span style={{ color: P.accent }}>Tracker</span>
            </span>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '7px 16px', border: 'none', borderRadius: '8px',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: tab === t.id ? P.accent : 'transparent',
                  color: tab === t.id ? '#fff' : P.muted,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: P.text }}>{user.username}</div>
              <div style={{ fontSize: '11px', color: P.muted }}>{user.email}</div>
            </div>
            <button onClick={logout} style={css.btn('ghost', true)}>Logout</button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 24px', position: 'relative', zIndex: 1 }}>
        {tab === 'tracker' && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: P.text, marginBottom: '4px' }}>
                My Job Applications
              </h1>
              <p style={{ color: P.muted, fontSize: '14px' }}>Track and manage your job search pipeline</p>
            </div>

            <StatsBar stats={stats} />

            {/* Toolbar */}
            <div style={{
              display: 'flex', gap: '12px', flexWrap: 'wrap',
              marginBottom: '20px', alignItems: 'center',
            }}>
              <div style={{ flex: '1 1 260px', position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                  color: P.muted, fontSize: '16px', pointerEvents: 'none',
                }}>🔍</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search company, title, location…"
                  style={{ ...css.input, paddingLeft: '38px' }}
                />
              </div>
              <button onClick={exportExcel} style={css.btn('ghost')}>
                📊 Export Excel
              </button>
              <button onClick={openAdd} style={css.btn('primary')}>
                + Add Job
              </button>
            </div>

            {loadingJobs ? (
              <div style={{ textAlign: 'center', padding: '60px', color: P.muted }}>
                <div style={{
                  width: '36px', height: '36px',
                  border: `3px solid rgba(233,69,96,0.2)`, borderTopColor: P.accent,
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 12px',
                }} />
                Loading jobs…
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              </div>
            ) : (
              <JobsTable
                jobs={jobs}
                search={search}
                onEdit={openEdit}
                onDelete={deleteJob}
              />
            )}
          </>
        )}

        {tab === 'ai' && (
          <AITab onSaveJob={async (form) => {
            await apiFetch('/jobs', { method: 'POST', body: JSON.stringify(form) })
            await fetchJobs()
          }} />
        )}
      </main>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editJob ? `Edit — ${editJob.company || 'Job'}` : 'Add New Job'}
      >
        <JobForm
          initial={editJob ? { ...editJob } : EMPTY_JOB}
          onSubmit={saveJob}
          onCancel={closeModal}
          loading={formLoading}
        />
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------

export default function App() {
  const [authed, setAuthed] = useState(() => !!getToken())
  const user = getUser()

  if (!authed || !user) {
    return <AuthPage onAuth={() => setAuthed(true)} />
  }
  return <Dashboard user={user} onLogout={() => setAuthed(false)} />
}
