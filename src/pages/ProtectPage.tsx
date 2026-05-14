import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { ToolPage } from '../components/ToolPage'
import { DropZone } from '../components/DropZone'
import { Button } from '../components/Button'
import '../components/ToolPage/ToolPage.css'
import './ProtectPage.css'

type Mode = 'encrypt' | 'decrypt'

export function ProtectPage() {
  const [mode, setMode] = useState<Mode>('encrypt')
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ url: string; name: string } | null>(null)

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
        <DropZone onFiles={onFile} accept=".pdf" sublabel="选择一个 PDF 文件" />
        {file && (
          <div className="protect-form">
            <p className="protect-form__filename">{file.name}</p>
            <label className="protect-form__label">
              {mode === 'encrypt' ? '用户密码（打开文件时需要）' : '当前密码'}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="输入密码"
              className="protect-input"
            />
            {mode === 'encrypt' && (
              <>
                <label className="protect-form__label" style={{ marginTop: 'var(--space-sm)' }}>
                  所有者密码（可选，用于限制编辑权限）
                </label>
                <input
                  type="password"
                  value={ownerPassword}
                  onChange={e => setOwnerPassword(e.target.value)}
                  placeholder="留空则与用户密码相同"
                  className="protect-input"
                />
              </>
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
