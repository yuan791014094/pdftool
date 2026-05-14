import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { ToolPage } from '../components/ToolPage'
import { DropZone } from '../components/DropZone'
import { Button } from '../components/Button'
import { useObjectUrl } from '../hooks/useObjectUrl'
import '../components/ToolPage/ToolPage.css'
import './ProtectPage.css'

type Mode = 'encrypt' | 'decrypt'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function PasswordInput({
  value, onChange, placeholder, label,
}: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="protect-form__label">{label}</label>
      <div className="protect-input-wrap" style={{ marginTop: 'var(--space-xs)' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="protect-input"
        />
        <button
          type="button"
          className="protect-eye"
          onClick={() => setShow(s => !s)}
          tabIndex={-1}
          aria-label={show ? '隐藏密码' : '显示密码'}
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  )
}

export function ProtectPage() {
  const [mode, setMode] = useState<Mode>('encrypt')
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ url: string; name: string } | null>(null)
  useObjectUrl(result?.url)

  const onFile = (files: File[]) => {
    const f = files[0]; if (!f) return
    setFile(f); setError(''); setResult(null)
  }

  const process = async () => {
    if (!file || !password.trim()) { setError('请输入密码'); return }
    setBusy(true); setError(''); setResult(null)
    try {
      const bytes = await file.arrayBuffer()
      if (mode === 'encrypt') {
        const doc = await PDFDocument.load(bytes)
        const out = await doc.save({
          userPassword: password,
          ownerPassword: ownerPassword || password,
          permissions: {
            printing: 'highResolution',
            modifying: false,
            copying: false,
            annotating: true,
            fillingForms: true,
            contentAccessibility: true,
            documentAssembly: false,
          },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        const blob = new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' })
        const name = file.name.replace(/\.pdf$/i, '') + '_protected.pdf'
        setResult({ url: URL.createObjectURL(blob), name })
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = await PDFDocument.load(bytes, { password } as any)
        const out = await doc.save()
        const blob = new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' })
        const name = file.name.replace(/\.pdf$/i, '') + '_unlocked.pdf'
        setResult({ url: URL.createObjectURL(blob), name })
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('password') || msg.includes('encrypted')) {
        setError('密码错误或文件已加密，请检查密码')
      } else {
        setError(`操作失败：${msg}`)
      }
    } finally { setBusy(false) }
  }

  return (
    <ToolPage title="加密 / 解密" desc="为 PDF 设置用户密码保护，或移除已有密码。">
      <div className="tool-card-inner">
        <div className="protect-tabs">
          <button
            className={`protect-tab ${mode === 'encrypt' ? 'protect-tab--active' : ''}`}
            onClick={() => { setMode('encrypt'); setError(''); setResult(null) }}
          >加密保护</button>
          <button
            className={`protect-tab ${mode === 'decrypt' ? 'protect-tab--active' : ''}`}
            onClick={() => { setMode('decrypt'); setError(''); setResult(null) }}
          >移除密码</button>
        </div>

        <div className="protect-hint">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M7.5 5v.5M7.5 7v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <span>
            {mode === 'encrypt'
              ? '加密后需用 Adobe Reader、WPS 等专业软件打开才会提示输入密码。Chrome/Edge 内置 PDF 查看器不执行密码限制，直接打开是正常现象。'
              : '输入 PDF 的打开密码，即可生成无密码保护的新文件。'}
          </span>
        </div>

        <DropZone onFiles={onFile} accept=".pdf" sublabel="选择一个 PDF 文件" />
        {file && (
          <div className="protect-form">
            <p className="protect-form__filename">{file.name}</p>
            <PasswordInput
              label={mode === 'encrypt' ? '用户密码（打开文件时需要）' : '当前密码'}
              value={password}
              onChange={setPassword}
              placeholder="输入密码"
            />
            {mode === 'encrypt' && (
              <PasswordInput
                label="所有者密码（可选，用于限制编辑权限）"
                value={ownerPassword}
                onChange={setOwnerPassword}
                placeholder="留空则与用户密码相同"
              />
            )}
          </div>
        )}
        {error && <div className="status-msg status-msg--error">{error}</div>}
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Button onClick={process} disabled={!file || busy || !password.trim()} loading={busy}>
            {mode === 'encrypt' ? '加密文件' : '解密文件'}
          </Button>
        </div>
      </div>
      {result && (
        <div className="result-box">
          <p className="result-box__label">{mode === 'encrypt' ? '加密完成' : '解密完成'}</p>
          <p className="result-box__filename">{result.name}</p>
          <Button variant="secondary-dark" onClick={() => { const a = document.createElement('a'); a.href = result.url; a.download = result.name; a.click() }}>
            下载文件
          </Button>
        </div>
      )}
    </ToolPage>
  )
}
