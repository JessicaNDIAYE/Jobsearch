import { useState, useEffect, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const STATUS_META = {
  saved:     { label: 'Saved',     color: '#6366F1', bg: '#EEF2FF', dot: '#6366F1' },
  applied:   { label: 'Applied',   color: '#F59E0B', bg: '#FFFBEB', dot: '#F59E0B' },
  interview: { label: 'Interview', color: '#10B981', bg: '#ECFDF5', dot: '#10B981' },
  offer:     { label: 'Offer',     color: '#8B5CF6', bg: '#F5F3FF', dot: '#8B5CF6' },
  rejected:  { label: 'Rejected',  color: '#EF4444', bg: '#FEF2F2', dot: '#EF4444' },
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
// Design tokens
// ---------------------------------------------------------------------------

const T = {
  bg:      '#F7F6F2',
  surface: '#FFFFFF',
  border:  '#E8E6E0',
  accent:  '#F5C842',
  accentDark: '#D4A900',
  text:    '#1A1A1A',
  muted:   '#6B7280',
  soft:    '#9CA3AF',
  rowHover: '#FAFAF7',
  rowSelected: '#FFFBEB',
  pill:    '#1A1A1A',
}

const inputStyle = {
  width: '100%',
  padding: '9px 13px',
  borderRadius: '8px',
  border: `1px solid ${T.border}`,
  background: T.surface,
  color: T.text,
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '14px',
  outline: 'none',
}

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: T.muted,
  marginBottom: '5px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

// ---------------------------------------------------------------------------
// Helpers
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

function avatarColor(str = '') {
  const colors = ['#F5C842','#10B981','#6366F1','#F59E0B','#8B5CF6','#EC4899','#14B8A6','#EF4444']
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return colors[Math.abs(h) % colors.length]
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.saved
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '20px',
      fontSize: '12px', fontWeight: 600,
      color: m.color, background: m.bg,
      border: `1px solid ${m.color}30`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

function Modal({ open, onClose, title, children, width = 580 }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  if (!open) return null
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.surface, borderRadius: '16px',
        border: `1px solid ${T.border}`,
        width: '100%', maxWidth: `${width}px`,
        maxHeight: '90vh', overflowY: 'auto',
        padding: '28px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: T.text }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: T.muted, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// JobForm
// ---------------------------------------------------------------------------

function JobForm({ initial = EMPTY_JOB, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const Field = ({ label, k, type = 'text', options }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      {options ? (
        <select value={form[k]} onChange={e => set(k, e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
          {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea value={form[k]} onChange={e => set(k, e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
      ) : (
        <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} style={inputStyle} />
      )}
    </div>
  )

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
        <Field label="Company" k="company" />
        <Field label="Job Title" k="job_title" />
        <Field label="Type" k="type" options={COMPANY_TYPES} />
        <Field label="Industry" k="industry" />
        <Field label="Location" k="location" />
        <Field label="Status" k="status" options={Object.entries(STATUS_META).map(([v, m]) => ({ value: v, label: m.label }))} />
        <Field label="Salary" k="salary" />
        <Field label="Job URL" k="job_url" type="url" />
      </div>
      <div style={{ marginBottom: '22px' }}><Field label="Notes" k="notes" type="textarea" /></div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{
          padding: '9px 18px', borderRadius: '8px', border: `1px solid ${T.border}`,
          background: 'transparent', color: T.muted, cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
        }}>Cancel</button>
        <button type="submit" disabled={loading} style={{
          padding: '9px 20px', borderRadius: '8px', border: 'none',
          background: T.accent, color: T.text, cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px',
        }}>{loading ? 'Saving…' : 'Save Job'}</button>
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
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const data = await apiFetch(mode === 'login' ? '/login' : '/register', {
        method: 'POST', body: JSON.stringify(form),
      })
      localStorage.setItem('jt_token', data.token)
      localStorage.setItem('jt_user', JSON.stringify({ username: data.username, email: data.email }))
      onAuth()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: T.pill, borderRadius: '12px', padding: '10px 20px',
          }}>
            <span style={{ fontSize: '20px' }}>🎯</span>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.01em' }}>
              Job<span style={{ color: T.accent }}>Tracker</span>
            </span>
          </div>
          <p style={{ color: T.muted, fontSize: '14px', marginTop: '12px' }}>
            {mode === 'login' ? 'Welcome back' : 'Start tracking your search'}
          </p>
        </div>

        <div style={{ background: T.surface, borderRadius: '16px', border: `1px solid ${T.border}`, padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {/* Toggle */}
          <div style={{ display: 'flex', background: T.bg, borderRadius: '10px', padding: '4px', marginBottom: '24px' }}>
            {['login','register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                flex: 1, padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px', transition: 'all 0.15s',
                background: mode === m ? T.surface : 'transparent',
                color: mode === m ? T.text : T.muted,
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}>{m === 'login' ? 'Sign In' : 'Sign Up'}</button>
            ))}
          </div>

          <form onSubmit={submit}>
            {mode === 'register' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Username</label>
                <input value={form.username} onChange={e => set('username', e.target.value)} placeholder="your_name" required style={inputStyle} />
              </div>
            )}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Password</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" required style={inputStyle} />
            </div>
            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', color: '#EF4444', fontSize: '13px' }}>{error}</div>
            )}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
              background: T.accent, color: T.text, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '15px',
            }}>{loading ? 'Loading…' : mode === 'login' ? 'Sign In' : 'Create Account'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatsBar (Crextio-style progress bars)
// ---------------------------------------------------------------------------

function StatsBar({ stats }) {
  if (!stats || !stats.total) return null
  const total = stats.total
  const items = Object.entries(STATUS_META).map(([k, m]) => ({
    label: m.label, count: stats.by_status?.[k] || 0,
    pct: total ? Math.round(((stats.by_status?.[k] || 0) / total) * 100) : 0,
    color: m.dot,
  }))

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: T.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
          <div style={{ width: '80px', height: '8px', borderRadius: '4px', background: '#E8E6E0', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${item.pct}%`, background: item.color, borderRadius: '4px', transition: 'width 0.4s' }} />
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: T.text, minWidth: '28px' }}>{item.pct}%</span>
        </div>
      ))}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: T.muted }}>Total</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: T.text }}>{total} jobs</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// JobsTable (Crextio-style)
// ---------------------------------------------------------------------------

function JobsTable({ jobs, onEdit, onDelete, search, statusFilter }) {
  const [selected, setSelected] = useState(new Set())
  const [hoveredRow, setHoveredRow] = useState(null)

  const filtered = jobs.filter(j => {
    const q = (search || '').toLowerCase()
    const matchSearch = !q || (
      (j.company || '').toLowerCase().includes(q) ||
      (j.job_title || '').toLowerCase().includes(q) ||
      (j.location || '').toLowerCase().includes(q) ||
      (j.industry || '').toLowerCase().includes(q)
    )
    const matchStatus = !statusFilter || j.status === statusFilter
    return matchSearch && matchStatus
  })

  const allChecked = filtered.length > 0 && filtered.every(j => selected.has(j.id))
  const toggleAll = () => {
    if (allChecked) setSelected(new Set())
    else setSelected(new Set(filtered.map(j => j.id)))
  }
  const toggle = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const th = {
    padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: T.muted,
    borderBottom: `1px solid ${T.border}`, textAlign: 'left', whiteSpace: 'nowrap',
    background: T.surface, userSelect: 'none',
  }
  const td = {
    padding: '11px 14px', fontSize: '13px', color: T.text,
    borderBottom: `1px solid ${T.border}`, verticalAlign: 'middle',
  }

  if (filtered.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: T.muted, fontSize: '14px' }}>
        {jobs.length === 0 ? 'No jobs yet — click "+ Add Job" to start tracking.' : 'No results for this search.'}
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
        <thead>
          <tr>
            <th style={{ ...th, width: '40px', paddingLeft: '16px' }}>
              <input type="checkbox" checked={allChecked} onChange={toggleAll}
                style={{ width: '15px', height: '15px', accentColor: T.accent, cursor: 'pointer' }} />
            </th>
            <th style={th}>Name</th>
            <th style={th}>Job Title</th>
            <th style={th}>Type</th>
            <th style={th}>Location</th>
            <th style={th}>Salary</th>
            <th style={th}>Added</th>
            <th style={th}>Status</th>
            <th style={{ ...th, textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(job => {
            const isSel = selected.has(job.id)
            const isHov = hoveredRow === job.id
            return (
              <tr key={job.id}
                onMouseEnter={() => setHoveredRow(job.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => onEdit(job)}
                style={{
                  background: isSel ? T.rowSelected : isHov ? T.rowHover : T.surface,
                  transition: 'background 0.1s', cursor: 'pointer',
                  ...(isSel ? { fontWeight: 500 } : {}),
                }}
              >
                <td style={{ ...td, paddingLeft: '16px', width: '40px' }} onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={isSel} onChange={() => toggle(job.id)}
                    style={{ width: '15px', height: '15px', accentColor: T.accent, cursor: 'pointer' }} />
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                      background: avatarColor(job.company),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 700, color: '#fff',
                    }}>{(job.company || '?')[0].toUpperCase()}</div>
                    <span style={{ fontWeight: 500 }}>{job.company || '—'}</span>
                  </div>
                </td>
                <td style={{ ...td, color: isSel ? T.accentDark : T.text, fontWeight: isSel ? 600 : 400 }}>
                  {job.job_title || '—'}
                </td>
                <td style={{ ...td, color: T.muted }}>{job.type || '—'}</td>
                <td style={{ ...td, color: T.muted }}>{job.location || '—'}</td>
                <td style={{ ...td, color: T.muted }}>{job.salary || '—'}</td>
                <td style={{ ...td, color: T.soft, fontSize: '12px' }}>
                  {job.created_at ? new Date(job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td style={td}><StatusBadge status={job.status} /></td>
                <td style={{ ...td, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                    {job.job_url && (
                      <a href={job.job_url} target="_blank" rel="noopener noreferrer"
                        style={{ padding: '5px 10px', borderRadius: '6px', background: T.bg, border: `1px solid ${T.border}`, fontSize: '12px', color: T.muted, textDecoration: 'none', fontWeight: 500 }}>
                        ↗
                      </a>
                    )}
                    <button onClick={() => onEdit(job)}
                      style={{ padding: '5px 10px', borderRadius: '6px', background: T.bg, border: `1px solid ${T.border}`, fontSize: '12px', color: T.muted, cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 500 }}>
                      Edit
                    </button>
                    <button onClick={() => onDelete(job.id)}
                      style={{ padding: '5px 10px', borderRadius: '6px', background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '12px', color: '#EF4444', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 500 }}>
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AITab
// ---------------------------------------------------------------------------

function AITab({ onSaveJob }) {
  const apiKey = import.meta.env.VITE_MISTRAL_API_KEY || ''
  const [keywords, setKeywords] = useState('Junior Data Scientist AI Engineer')
  const [location, setLocation] = useState('Lyon, France')
  const [level, setLevel] = useState('junior')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedIds, setSavedIds] = useState(new Set())

  const search = async () => {
    if (!apiKey) { setError('VITE_MISTRAL_API_KEY not set in frontend/.env'); return }
    setLoading(true); setError(''); setResults([])
    try {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral-large-latest', temperature: 0.3, max_tokens: 2000,
          messages: [
            { role: 'system', content: AI_SYSTEM_PROMPT },
            { role: 'user', content: `Find ${level} job opportunities for: ${keywords}. Location: ${location}. Return JSON array only.` },
          ],
        }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'API error') }
      const data = await res.json()
      const jobs = JSON.parse(data.choices?.[0]?.message?.content || '[]')
      if (!Array.isArray(jobs)) throw new Error('Invalid response')
      setResults(jobs)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const saveJob = async (job, idx) => {
    try {
      await onSaveJob({
        company: job.company || '', job_title: job.job_title || '', type: job.type || 'Startup',
        industry: job.industry || '', location: job.location || '',
        notes: `${job.notes || ''}\n\nSearch: ${job.search_query || ''}`.trim(),
        job_url: '', salary: '', status: 'saved',
      })
      setSavedIds(s => new Set([...s, idx]))
    } catch (err) { alert('Failed to save: ' + err.message) }
  }

  return (
    <div>
      {/* Header card */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>✨</div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: T.text }}>AI Job Finder</h2>
            <p style={{ color: T.muted, fontSize: '12px' }}>Powered by Mistral — tailored junior AI & Data positions</p>
          </div>
        </div>

        {!apiKey && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#92400E', fontSize: '13px' }}>
            ⚠️ Set <code style={{ background: '#FEF3C7', padding: '1px 5px', borderRadius: '3px' }}>VITE_MISTRAL_API_KEY</code> in <code style={{ background: '#FEF3C7', padding: '1px 5px', borderRadius: '3px' }}>frontend/.env</code>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '10px', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Keywords / Roles</label>
            <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Junior Data Scientist…" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Lyon, Paris, Remote…" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Level</label>
            <select value={level} onChange={e => setLevel(e.target.value)} style={{ ...inputStyle, width: 'auto', appearance: 'none', paddingRight: '28px' }}>
              <option value="junior">Junior</option>
              <option value="intern">Intern</option>
            </select>
          </div>
          <div style={{ paddingBottom: '1px' }}>
            <label style={{ ...labelStyle, visibility: 'hidden' }}>_</label>
            <button onClick={search} disabled={loading || !apiKey} style={{
              padding: '9px 20px', borderRadius: '8px', border: 'none',
              background: !apiKey || loading ? '#E8E6E0' : T.accent,
              color: T.text, cursor: !apiKey || loading ? 'not-allowed' : 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px',
              whiteSpace: 'nowrap',
            }}>
              {loading ? 'Searching…' : 'Find Jobs'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#EF4444', fontSize: '13px' }}>{error}</div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: T.muted }}>
          <div style={{ width: '32px', height: '32px', border: `3px solid ${T.border}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          Mistral is finding opportunities…
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: T.text }}>{results.length} opportunities found</span>
          </div>
          {results.map((job, idx) => (
            <div key={idx} style={{
              padding: '16px 20px', borderBottom: idx < results.length - 1 ? `1px solid ${T.border}` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
              background: savedIds.has(idx) ? '#F0FDF4' : T.surface,
              transition: 'background 0.15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0, background: avatarColor(job.company), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                  {(job.company || '?')[0].toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: T.text }}>{job.job_title}</div>
                  <div style={{ color: T.muted, fontSize: '12px' }}>{job.company} · {job.location} · {job.industry}</div>
                  {job.notes && <div style={{ color: T.soft, fontSize: '12px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.notes}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: '#F5F3FF', color: '#8B5CF6', border: '1px solid #DDD6FE' }}>{job.type}</span>
                <button onClick={() => saveJob(job, idx)} disabled={savedIds.has(idx)} style={{
                  padding: '7px 14px', borderRadius: '8px', border: 'none',
                  background: savedIds.has(idx) ? '#DCFCE7' : T.accent,
                  color: savedIds.has(idx) ? '#16A34A' : T.text,
                  cursor: savedIds.has(idx) ? 'default' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px',
                }}>{savedIds.has(idx) ? '✓ Saved' : '+ Save'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
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
  const [statusFilter, setStatusFilter] = useState('')
  const [tab, setTab] = useState('tracker')
  const [modalOpen, setModalOpen] = useState(false)
  const [editJob, setEditJob] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [loadingJobs, setLoadingJobs] = useState(true)

  const fetchJobs = useCallback(async () => {
    try {
      const [j, s] = await Promise.all([apiFetch('/jobs'), apiFetch('/stats')])
      setJobs(j); setStats(s)
    } catch (err) { console.error(err) }
    finally { setLoadingJobs(false) }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const saveJob = async (form) => {
    setFormLoading(true)
    try {
      if (editJob) await apiFetch(`/jobs/${editJob.id}`, { method: 'PUT', body: JSON.stringify(form) })
      else await apiFetch('/jobs', { method: 'POST', body: JSON.stringify(form) })
      await fetchJobs(); setModalOpen(false); setEditJob(null)
    } catch (err) { alert(err.message) }
    finally { setFormLoading(false) }
  }

  const deleteJob = async (id) => {
    if (!confirm('Delete this job?')) return
    try { await apiFetch(`/jobs/${id}`, { method: 'DELETE' }); await fetchJobs() }
    catch (err) { alert(err.message) }
  }

  const exportExcel = () => {
    const token = getToken()
    fetch(`${API}/jobs/export`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `jobtracker_${user.username}.xlsx`; a.click()
        URL.revokeObjectURL(url)
      })
  }

  const logout = async () => {
    try { await apiFetch('/logout', { method: 'POST' }) } catch {}
    localStorage.removeItem('jt_token'); localStorage.removeItem('jt_user'); onLogout()
  }

  const navTabs = [
    { id: 'tracker', label: 'Jobs' },
    { id: 'ai',      label: 'AI Finder' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'DM Sans, sans-serif' }}>
      {/* Top nav */}
      <nav style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '0 28px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', alignItems: 'center', height: '56px', gap: '24px' }}>
          {/* Logo */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: T.pill, borderRadius: '10px', padding: '6px 14px', flexShrink: 0 }}>
            <span style={{ fontSize: '16px' }}>🎯</span>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '15px' }}>Job<span style={{ color: T.accent }}>Tracker</span></span>
          </div>

          {/* Nav tabs */}
          <div style={{ display: 'flex', gap: '2px' }}>
            {navTabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '6px 14px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px', transition: 'all 0.12s',
                background: tab === t.id ? T.pill : 'transparent',
                color: tab === t.id ? '#fff' : T.muted,
              }}>{t.label}</button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: T.text }}>{user.username}</div>
              <div style={{ fontSize: '11px', color: T.muted }}>{user.email}</div>
            </div>
            <button onClick={logout} style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${T.border}`, background: 'transparent', color: T.muted, cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 600, fontSize: '13px' }}>Logout</button>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: '1300px', margin: '0 auto', padding: '24px 28px' }}>
        {tab === 'tracker' && (
          <>
            {/* Page header */}
            <div style={{ marginBottom: '20px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: T.text, letterSpacing: '-0.02em', marginBottom: '14px' }}>Jobs</h1>
              {/* Stats progress bars */}
              <StatsBar stats={stats} />
            </div>

            {/* Main card */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              {/* Toolbar */}
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Status filter pills */}
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {[{ value: '', label: 'All' }, ...Object.entries(STATUS_META).map(([v, m]) => ({ value: v, label: m.label }))].map(opt => (
                    <button key={opt.value} onClick={() => setStatusFilter(opt.value)} style={{
                      padding: '5px 12px', borderRadius: '20px', border: `1px solid ${statusFilter === opt.value ? T.accentDark : T.border}`,
                      background: statusFilter === opt.value ? T.accent : T.bg,
                      color: statusFilter === opt.value ? T.text : T.muted,
                      cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 600, fontSize: '12px',
                      transition: 'all 0.12s',
                    }}>{opt.label}</button>
                  ))}
                </div>

                {/* Search */}
                <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '280px', marginLeft: 'auto' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: T.soft, fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                    style={{ ...inputStyle, paddingLeft: '32px', fontSize: '13px' }} />
                </div>

                {/* Actions */}
                <button onClick={exportExcel} style={{ padding: '7px 14px', borderRadius: '8px', border: `1px solid ${T.border}`, background: T.bg, color: T.muted, cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  ↓ Export
                </button>
                <button onClick={() => { setEditJob(null); setModalOpen(true) }} style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: T.accent, color: T.text, cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  + Add Job
                </button>
              </div>

              {/* Table */}
              {loadingJobs ? (
                <div style={{ textAlign: 'center', padding: '60px', color: T.muted }}>
                  <div style={{ width: '28px', height: '28px', border: `3px solid ${T.border}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 10px' }} />
                  Loading…
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              ) : (
                <JobsTable jobs={jobs} search={search} statusFilter={statusFilter} onEdit={j => { setEditJob(j); setModalOpen(true) }} onDelete={deleteJob} />
              )}
            </div>
          </>
        )}

        {tab === 'ai' && (
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: T.text, letterSpacing: '-0.02em', marginBottom: '20px' }}>AI Finder</h1>
            <AITab onSaveJob={async (form) => {
              await apiFetch('/jobs', { method: 'POST', body: JSON.stringify(form) })
              await fetchJobs()
            }} />
          </div>
        )}
      </main>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditJob(null) }} title={editJob ? `Edit — ${editJob.company || 'Job'}` : 'Add New Job'}>
        <JobForm initial={editJob ? { ...editJob } : EMPTY_JOB} onSubmit={saveJob} onCancel={() => { setModalOpen(false); setEditJob(null) }} loading={formLoading} />
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const [authed, setAuthed] = useState(() => !!getToken())
  const user = getUser()
  if (!authed || !user) return <AuthPage onAuth={() => setAuthed(true)} />
  return <Dashboard user={user} onLogout={() => setAuthed(false)} />
}
