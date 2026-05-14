import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { ToolPage } from '../components/ToolPage'
import { DropZone } from '../components/DropZone'
import { Button } from '../components/Button'
import '../components/ToolPage/ToolPage.css'

export function ExtractPage() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ url: string; name: string } | null>(null)

  const onFile = async (files: File[]) => {
    const f = files[0]; if (!f) return
    setError(''); setResult(null)
    try {
      const buf = await f.arrayBuffer()
      const doc = await PDFDocument.load(buf)
      setPageCount(doc.getPageCount())
      setFile(f)
      setInput('')
    } catch { setError('无法读取 PDF 文件') }
  }

  /* Parse "1,3,5-8,10" → [0,2,4,5,6,7,9] (0-based) */
  const parsePages = (s: string, total: number): number[] | null => {
    const set = new Set<number>()
    for (const part of s.split(',')) {
      const t = part.trim()
      const range = t.match(/^(\d+)\s*-\s*(\d+)$/)
      if (range) {
        const a = parseInt(range[1]), b = parseInt(range[2])
        if (a < 1 || b > total || a > b) return null
        for (let i = a; i <= b; i++) set.add(i - 1)
      } else {
        const n = parseInt(t)
        if (isNaN(n) || n < 1 || n > total) return null
        set.add(n - 1)
      }
    }
    return Array.from(set).sort((a, b) => a - b)
  }

  const extract = async () => {
    if (!file) return
    const indices = parsePages(input, pageCount)
    if (!indices || indices.length === 0) { setError('页码格式无效，示例：1,3,5-8'); return }
    setBusy(true); setError(''); setResult(null)
    try {
      const bytes = await file.arrayBuffer()
      const src = await PDFDocument.load(bytes)
      const doc = await PDFDocument.create()
      const pages = await doc.copyPages(src, indices)
      pages.forEach(p => doc.addPage(p))
      const out = await doc.save()
      const blob = new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' })
      const name = file.name.replace(/\.pdf$/i, '') + '_extracted.pdf'
      setResult({ url: URL.createObjectURL(blob), name })
    } catch (e: unknown) {
      setError(`提取失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolPage title="提取页面" desc="输入页码（如 1,3,5-8），从 PDF 中提取指定页面。">
      <div className="tool-card-inner">
        <DropZone onFiles={onFile} accept=".pdf" sublabel="选择一个 PDF 文件" />
        {file && (
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-muted)', marginBottom: 'var(--space-xs)' }}>
              {file.name}（共 {pageCount} 页）
            </p>
            <label style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 500, color: 'var(--color-body-strong)', marginBottom: 'var(--space-xs)' }}>
              页码范围
            </label>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`如：1,3,5-${pageCount}`}
              className="page-input"
              style={{
                width: '100%', height: 40, padding: '0 14px',
                border: '1px solid var(--color-hairline)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-canvas)',
                fontSize: 'var(--text-body-md)',
                color: 'var(--color-ink)',
                fontFamily: 'var(--font-body)',
              }}
            />
            <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 'var(--space-xs)' }}>
              用逗号分隔页码，用连字符表示范围
            </p>
          </div>
        )}
        {error && <div className="status-msg status-msg--error">{error}</div>}
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Button onClick={extract} disabled={!file || busy || !input.trim()} loading={busy}>提取页面</Button>
        </div>
      </div>
      {result && (
        <div className="result-box">
          <p className="result-box__label">提取完成</p>
          <p className="result-box__filename">{result.name}</p>
          <Button variant="secondary-dark" onClick={() => { const a = document.createElement('a'); a.href = result.url; a.download = result.name; a.click() }}>
            下载文件
          </Button>
        </div>
      )}
    </ToolPage>
  )
}
