import { useState, useCallback } from 'react'
import { PDFDocument } from 'pdf-lib'
import { ToolPage } from '../components/ToolPage'
import { DropZone } from '../components/DropZone'
import { Button } from '../components/Button'
import { PdfThumbnails } from '../components/PdfThumbnails'
import { useObjectUrl } from '../hooks/useObjectUrl'
import '../components/ToolPage/ToolPage.css'

export function ExtractPage() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [input, setInput] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ url: string; name: string } | null>(null)
  useObjectUrl(result?.url)

  const onFile = async (files: File[]) => {
    const f = files[0]; if (!f) return
    setError(''); setResult(null); setSelected(new Set()); setInput('')
    try {
      const buf = await f.arrayBuffer()
      const doc = await PDFDocument.load(buf)
      setPageCount(doc.getPageCount())
      setFile(f)
    } catch { setError('无法读取 PDF 文件') }
  }

  /* Toggle page selection via thumbnail click */
  const togglePage = useCallback((index: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index); else next.add(index)
      // Sync to text input
      const sorted = Array.from(next).sort((a, b) => a - b).map(i => i + 1).join(',')
      setInput(sorted)
      return next
    })
  }, [])

  /* Parse "1,3,5-8,10" → [0,2,4,5,6,7,9] (0-based) */
  const parsePages = (s: string, total: number): number[] | null => {
    const set = new Set<number>()
    for (const part of s.split(',')) {
      const t = part.trim(); if (!t) continue
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

  /* Sync thumbnail highlights when user types manually */
  const onInputChange = (val: string) => {
    setInput(val)
    const indices = parsePages(val, pageCount)
    setSelected(new Set(indices ?? []))
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
    } finally { setBusy(false) }
  }

  return (
    <ToolPage title="提取页面" desc="点击缩略图选择页面，或直接输入页码（如 1,3,5-8）。">
      <div className="tool-card-inner">
        <DropZone onFiles={onFile} accept=".pdf" sublabel="选择一个 PDF 文件" />
        {file && (
          <>
            {/* Thumbnail selector */}
            <PdfThumbnails
              file={file}
              highlighted={selected}
              onSelect={togglePage}
            />
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <label style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 500, color: 'var(--color-body-strong)', marginBottom: 'var(--space-xs)' }}>
                已选页码（点击缩略图或手动输入）
              </label>
              <input
                type="text"
                value={input}
                onChange={e => onInputChange(e.target.value)}
                placeholder={`如：1,3,5-${pageCount}`}
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
                已选 {selected.size} 页 · 共 {pageCount} 页
              </p>
            </div>
          </>
        )}
        {error && <div className="status-msg status-msg--error">{error}</div>}
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Button onClick={extract} disabled={!file || busy || !input.trim()} loading={busy}>
            提取页面
          </Button>
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
