import { useState } from 'react'
import { PDFDocument, degrees } from 'pdf-lib'
import { ToolPage } from '../components/ToolPage'
import { DropZone } from '../components/DropZone'
import { Button } from '../components/Button'
import { useObjectUrl } from '../hooks/useObjectUrl'
import '../components/ToolPage/ToolPage.css'
import './RotatePage.css'

const ANGLES = [90, 180, 270] as const
type Angle = typeof ANGLES[number]

export function RotatePage() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [target, setTarget] = useState<'all' | 'range'>('all')
  const [rangeInput, setRangeInput] = useState('')
  const [angle, setAngle] = useState<Angle>(90)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ url: string; name: string } | null>(null)
  useObjectUrl(result?.url)

  const onFile = async (files: File[]) => {
    const f = files[0]; if (!f) return
    setError(''); setResult(null)
    try {
      const buf = await f.arrayBuffer()
      const doc = await PDFDocument.load(buf)
      setPageCount(doc.getPageCount()); setFile(f)
    } catch { setError('无法读取 PDF 文件') }
  }

  const parsePages = (s: string, total: number): number[] | null => {
    if (s.trim() === '') return null  // empty input = validation error, not "all pages"
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
    return Array.from(set)
  }

  const rotate = async () => {
    if (!file) return
    const indices = target === 'all'
      ? Array.from({ length: pageCount }, (_, i) => i)
      : parsePages(rangeInput, pageCount)
    if (!indices || indices.length === 0) { setError('请输入有效页码，如：1,3,5-8'); return }
    setBusy(true); setError(''); setResult(null)
    try {
      const bytes = await file.arrayBuffer()
      const doc = await PDFDocument.load(bytes)
      const pages = doc.getPages()
      indices.forEach(i => {
        const page = pages[i]
        page.setRotation(degrees((page.getRotation().angle + angle) % 360))
      })
      const out = await doc.save()
      const blob = new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' })
      const name = file.name.replace(/\.pdf$/i, '') + '_rotated.pdf'
      setResult({ url: URL.createObjectURL(blob), name })
    } catch (e: unknown) {
      setError(`旋转失败：${e instanceof Error ? e.message : String(e)}`)
    } finally { setBusy(false) }
  }

  return (
    <ToolPage title="旋转页面" desc="对 PDF 页面进行旋转操作。">
      <div className="tool-card-inner">
        <DropZone onFiles={onFile} accept=".pdf" sublabel="选择一个 PDF 文件" />
        {file && (
          <div className="rotate-options">
            <p className="rotate-options__name">{file.name}（共 {pageCount} 页）</p>
            <div className="rotate-field">
              <p className="rotate-field__label">旋转角度</p>
              <div className="rotate-angle-group">
                {ANGLES.map(a => (
                  <button
                    key={a}
                    className={`rotate-angle-btn ${angle === a ? 'rotate-angle-btn--active' : ''}`}
                    onClick={() => setAngle(a)}
                  >
                    {a}°
                  </button>
                ))}
              </div>
            </div>
            <div className="rotate-field">
              <p className="rotate-field__label">应用范围</p>
              <div className="rotate-target-group">
                <button
                  className={`rotate-target-btn ${target === 'all' ? 'rotate-target-btn--active' : ''}`}
                  onClick={() => setTarget('all')}
                >全部页面</button>
                <button
                  className={`rotate-target-btn ${target === 'range' ? 'rotate-target-btn--active' : ''}`}
                  onClick={() => setTarget('range')}
                >指定页面</button>
              </div>
              {target === 'range' && (
                <input
                  type="text"
                  value={rangeInput}
                  onChange={e => setRangeInput(e.target.value)}
                  placeholder={`如：1,3,5-${pageCount}`}
                  style={{
                    marginTop: 'var(--space-sm)',
                    width: '100%', height: 40, padding: '0 14px',
                    border: '1px solid var(--color-hairline)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-canvas)',
                    fontSize: 'var(--text-body-md)',
                    color: 'var(--color-ink)',
                    fontFamily: 'var(--font-body)',
                  }}
                />
              )}
            </div>
          </div>
        )}
        {error && <div className="status-msg status-msg--error">{error}</div>}
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Button onClick={rotate} disabled={!file || busy} loading={busy}>应用旋转</Button>
        </div>
      </div>
      {result && (
        <div className="result-box">
          <p className="result-box__label">旋转完成</p>
          <p className="result-box__filename">{result.name}</p>
          <Button variant="secondary-dark" onClick={() => { const a = document.createElement('a'); a.href = result.url; a.download = result.name; a.click() }}>
            下载文件
          </Button>
        </div>
      )}
    </ToolPage>
  )
}
