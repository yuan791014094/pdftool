import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { ToolPage } from '../components/ToolPage'
import { DropZone } from '../components/DropZone'
import { Button } from '../components/Button'
import { ProgressBar } from '../components/ProgressBar'
import '../components/ToolPage/ToolPage.css'
import './SplitPage.css'

interface Range {
  id: string
  from: string
  to: string
}

function uid() { return Math.random().toString(36).slice(2) }

export function SplitPage() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [ranges, setRanges] = useState<Range[]>([{ id: uid(), from: '1', to: '' }])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [results, setResults] = useState<{ url: string; name: string }[]>([])

  const onFile = async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setError(''); setResults([])
    try {
      const buf = await f.arrayBuffer()
      const doc = await PDFDocument.load(buf)
      setPageCount(doc.getPageCount())
      setFile(f)
      setRanges([{ id: uid(), from: '1', to: String(doc.getPageCount()) }])
    } catch {
      setError('无法读取 PDF 文件')
    }
  }

  const addRange = () => setRanges(r => [...r, { id: uid(), from: '', to: '' }])
  const removeRange = (id: string) => setRanges(r => r.filter(x => x.id !== id))
  const updateRange = (id: string, field: 'from' | 'to', val: string) =>
    setRanges(r => r.map(x => x.id === id ? { ...x, [field]: val } : x))

  const split = async () => {
    if (!file) return
    setBusy(true); setError(''); setResults([]); setProgress(0)
    try {
      const bytes = await file.arrayBuffer()
      const src = await PDFDocument.load(bytes)
      const total = src.getPageCount()
      const outputs: { url: string; name: string }[] = []

      for (let i = 0; i < ranges.length; i++) {
        const from = Math.max(1, parseInt(ranges[i].from) || 1)
        const to = Math.min(total, parseInt(ranges[i].to) || total)
        if (from > to) { setError(`范围 ${i + 1}: 起始页不能大于结束页`); setBusy(false); return }
        const doc = await PDFDocument.create()
        const indices = Array.from({ length: to - from + 1 }, (_, k) => from - 1 + k)
        const pages = await doc.copyPages(src, indices)
        pages.forEach(p => doc.addPage(p))
        const out = await doc.save()
        const blob = new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' })
        const baseName = file.name.replace(/\.pdf$/i, '')
        outputs.push({ url: URL.createObjectURL(blob), name: `${baseName}_p${from}-${to}.pdf` })
        setProgress(Math.round(((i + 1) / ranges.length) * 100))
      }
      setResults(outputs)
    } catch (e: unknown) {
      setError(`拆分失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const download = (url: string, name: string) => {
    const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  }

  return (
    <ToolPage title="拆分 PDF" desc="设置页码范围，将 PDF 拆分为多个文件。">
      <div className="tool-card-inner">
        <DropZone onFiles={onFile} accept=".pdf" sublabel="选择一个 PDF 文件" />
        {file && (
          <div className="split-info">
            <span className="split-info__name">{file.name}</span>
            <span className="split-info__count">共 {pageCount} 页</span>
          </div>
        )}
        {file && (
          <div className="split-ranges">
            <p className="split-ranges__label">拆分范围</p>
            {ranges.map((r, i) => (
              <div key={r.id} className="split-range-row">
                <span className="split-range-row__num">片段 {i + 1}</span>
                <label className="split-range-row__field">
                  <span>从第</span>
                  <input
                    type="number" min={1} max={pageCount}
                    value={r.from}
                    onChange={e => updateRange(r.id, 'from', e.target.value)}
                    className="split-input"
                  />
                  <span>页</span>
                </label>
                <label className="split-range-row__field">
                  <span>到第</span>
                  <input
                    type="number" min={1} max={pageCount}
                    value={r.to}
                    onChange={e => updateRange(r.id, 'to', e.target.value)}
                    className="split-input"
                  />
                  <span>页</span>
                </label>
                {ranges.length > 1 && (
                  <button className="split-remove" onClick={() => removeRange(r.id)}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={addRange}>+ 添加范围</Button>
          </div>
        )}
        {error && <div className="status-msg status-msg--error">{error}</div>}
        {busy && <ProgressBar value={progress} label="拆分中..." />}
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Button onClick={split} disabled={!file || busy} loading={busy}>拆分 PDF</Button>
        </div>
      </div>
      {results.length > 0 && (
        <div className="result-box">
          <p className="result-box__label">拆分完成，共 {results.length} 个文件</p>
          {results.map(r => (
            <div key={r.url} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', width: '100%' }}>
              <p className="result-box__filename" style={{ flex: 1 }}>{r.name}</p>
              <Button variant="secondary-dark" size="sm" onClick={() => download(r.url, r.name)}>下载</Button>
            </div>
          ))}
        </div>
      )}
    </ToolPage>
  )
}
