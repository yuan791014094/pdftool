import { useState, useEffect, useRef } from 'react'
import './FeedbackModal.css'

interface Props {
  open: boolean
  onClose: () => void
}

type FeedbackType = 'bug' | 'suggestion' | 'other'

const TYPE_LABELS: { key: FeedbackType; label: string }[] = [
  { key: 'bug', label: '报告问题' },
  { key: 'suggestion', label: '功能建议' },
  { key: 'other', label: '其他' },
]

const DAILY_LIMIT = 3
const COOLDOWN_MS = 60_000
const MIN_LENGTH = 10

function getSubmitLog(): number[] {
  try {
    const raw = localStorage.getItem('fb_log')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function recordSubmit() {
  const log = getSubmitLog()
  log.push(Date.now())
  localStorage.setItem('fb_log', JSON.stringify(log.slice(-20)))
}

function checkRateLimit(): string | null {
  const now = Date.now()
  const log = getSubmitLog()
  const todayStart = new Date().setHours(0, 0, 0, 0)
  const todayCount = log.filter(t => t >= todayStart).length
  if (todayCount >= DAILY_LIMIT) return `每天最多提交 ${DAILY_LIMIT} 次反馈，请明天再试`
  const last = log[log.length - 1]
  if (last && now - last < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - (now - last)) / 1000)
    return `操作太频繁，请 ${wait} 秒后再试`
  }
  return null
}

export function FeedbackModal({ open, onClose }: Props) {
  const [type, setType] = useState<FeedbackType>('bug')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')
  const [errMsg, setErrMsg] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) { setStatus('idle'); setMessage(''); setEmail(''); setHoneypot(''); setType('bug'); setErrMsg('') }
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (honeypot) return
    const trimmed = message.trim()
    if (!trimmed) return
    if (trimmed.length < MIN_LENGTH) { setStatus('err'); setErrMsg(`请至少输入 ${MIN_LENGTH} 个字符`); return }
    const limitMsg = checkRateLimit()
    if (limitMsg) { setStatus('err'); setErrMsg(limitMsg); return }
    setStatus('sending')
    try {
      const body = new FormData()
      body.append('access_key', 'e5e09812-5e27-4b89-83e1-df54c9a2ac89')
      body.append('subject', `PDF工具箱反馈 [${TYPE_LABELS.find(t => t.key === type)?.label}]`)
      body.append('from_name', 'PDF工具箱用户')
      body.append('message', trimmed)
      if (email.trim()) body.append('email', email.trim())
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body })
      const json = await res.json()
      if (json.success) { setStatus('ok'); recordSubmit() }
      else { setStatus('err'); setErrMsg(json.message ?? '提交失败，请稍后再试') }
    } catch {
      setStatus('err'); setErrMsg('网络错误，请检查网络后重试')
    }
  }

  return (
    <div
      className="fb-overlay"
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="发送反馈"
    >
      <div className="fb-modal">
        <div className="fb-header">
          <h2 className="fb-title">发送反馈</h2>
          <button className="fb-close" onClick={onClose} aria-label="关闭">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {status === 'ok' ? (
          <div className="fb-success">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="19" stroke="#5db8a6" strokeWidth="1.6"/>
              <path d="M12 20l6 6 10-12" stroke="#5db8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>反馈已发送，感谢你的宝贵意见！</p>
            <button className="fb-btn-primary" onClick={onClose}>关闭</button>
          </div>
        ) : (
          <form onSubmit={submit} className="fb-form">
            <input
              type="text"
              name="botcheck"
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={e => setHoneypot(e.target.value)}
            />
            <div className="fb-field">
              <label className="fb-label">类型</label>
              <div className="fb-type-group">
                {TYPE_LABELS.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    className={`fb-type-btn ${type === t.key ? 'fb-type-btn--active' : ''}`}
                    onClick={() => setType(t.key)}
                  >{t.label}</button>
                ))}
              </div>
            </div>

            <div className="fb-field">
              <label className="fb-label" htmlFor="fb-message">描述 <span className="fb-required">*</span></label>
              <textarea
                id="fb-message"
                className="fb-textarea"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="请描述你遇到的问题或建议（至少 10 个字符）…"
                rows={6}
                maxLength={1000}
                required
              />
              <span className="fb-char-count">{message.length}/1000</span>
            </div>

            <div className="fb-field">
              <label className="fb-label" htmlFor="fb-email">联系邮箱（选填）</label>
              <input
                id="fb-email"
                type="email"
                className="fb-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="方便回复时联系你"
              />
            </div>

            {status === 'err' && (
              <p className="fb-error">{errMsg}</p>
            )}

            <div className="fb-actions">
              <button type="button" className="fb-btn-secondary" onClick={onClose} disabled={status === 'sending'}>取消</button>
              <button type="submit" className="fb-btn-primary" disabled={!message.trim() || status === 'sending'}>
                {status === 'sending' ? '发送中…' : '发送反馈'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
