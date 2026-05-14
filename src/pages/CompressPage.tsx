import { useState } from 'react'
import { pdfjs } from '../lib/pdfjs'
import { PDFDocument } from 'pdf-lib'
import { ToolPage } from '../components/ToolPage'
import { DropZone } from '../components/DropZone'
import { Button } from '../components/Button'
import { ProgressBar } from '../components/ProgressBar'
import { useObjectUrl } from '../hooks/useObjectUrl'
import '../components/ToolPage/ToolPage.css'
import './CompressPage.css'

type Level = 'low' | 'medium' | 'high'

const LEVELS: { key: Level; label: string; desc: string; scale: number; quality: number }[] = [
  { key: 'low',    label: '轻度压缩', desc: '质量优先，体积略减',  scale: 1.5, quality: 0.85 },
  { key: 'medium', label: '均衡压缩', desc: '质量与体积均衡',      scale: 1.2, quality: 0.72 },
  { key: 'high',   label: '最大压缩', desc: '体积优先，质量略降',  scale: 0.9, quality: 0.55 },
]

function fmt(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

export function CompressPage() {
  const [file, setFile] = useState<File | null>(null)
  const [level, setLevel] = useState<Level>('medium')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null)
  useObjectUrl(result?.url)

  const onFile = (files: File[]) => {
    const f = files[0]; if (!f) return
    setFile(f); setError(''); setResult(null)
  }

  const compress = async () => {
    if (!file) return
    const cfg = LEVELS.find(l => l.key === level)!
    setBusy(true); setError(''); setResult(null); setProgress(0)

    try {
      // Step 1: render each page to canvas via pdfjs at lower scale
      const srcBuf = await file.arrayBuffer()
      const srcDoc = await pdfjs.getDocument({ data: srcBuf.slice(0) }).promise
      const pageCount = srcDoc.numPages

      // Step 2: rebuild PDF with compressed page images via pdf-lib
      const outDoc = await PDFDocument.create()

      for (let i = 1; i <= pageCount; i++) {
        const page = await srcDoc.getPage(i)
        const vp = page.getViewport({ scale: cfg.scale })

        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(vp.width)
        canvas.height = Math.round(vp.height)
        const ctx = canvas.getContext('2d')!
        await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise

        const dataUrl = canvas.toDataURL('image/jpeg', cfg.quality)
        const base64  = dataUrl.split(',')[1]
        const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))

        const jpgImg  = await outDoc.embedJpg(imgBytes)
        const outPage = outDoc.addPage([vp.width, vp.height])
        outPage.drawImage(jpgImg, { x: 0, y: 0, width: vp.width, height: vp.height })

        setProgress(Math.round((i / pageCount) * 90))
      }

      const outBytes = await outDoc.save()
      setProgress(100)

      const blob = new Blob([outBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const name = file.name.replace(/\.pdf$/i, '') + '_compressed.pdf'
      setResult({ url: URL.createObjectURL(blob), name, size: blob.size })
    } catch (e: unknown) {
      setError(`压缩失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const ratio = result && file ? Math.round((1 - result.size / file.size) * 100) : 0
  const ratioLabel = ratio > 0 ? `-${ratio}%` : ratio < 0 ? `+${Math.abs(ratio)}%（已是最优）` : '0%'

  return (
    <ToolPage title="PDF 压缩" desc="通过降低内嵌图片分辨率来减小 PDF 文件体积。纯文字 PDF 压缩效果有限。">
      <div className="tool-card-inner">
        <DropZone onFiles={onFile} accept=".pdf" sublabel="选择一个 PDF 文件" />

        {file && (
          <div className="compress-options">
            <p className="compress-filename">
              {file.name} <span className="compress-size">({fmt(file.size)})</span>
            </p>
            <p className="compress-field-label">压缩级别</p>
            <div className="compress-levels">
              {LEVELS.map(l => (
                <button
                  key={l.key}
                  className={`compress-level-btn ${level === l.key ? 'compress-level-btn--active' : ''}`}
                  onClick={() => setLevel(l.key)}
                >
                  <span className="compress-level-name">{l.label}</span>
                  <span className="compress-level-desc">{l.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <div className="status-msg status-msg--error">{error}</div>}
        {busy && <ProgressBar value={progress} label="压缩中..." />}

        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Button onClick={compress} disabled={!file || busy} loading={busy}>
            开始压缩
          </Button>
        </div>
      </div>

      {result && (
        <div className="result-box">
          <p className="result-box__label">压缩完成</p>
          <div className="compress-result-stats">
            <div className="compress-stat">
              <span className="compress-stat__label">原始大小</span>
              <span className="compress-stat__value">{fmt(file!.size)}</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-on-dark-soft)', flexShrink: 0 }}>
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="compress-stat">
              <span className="compress-stat__label">压缩后</span>
              <span className="compress-stat__value">{fmt(result.size)}</span>
            </div>
            <div className={`compress-badge ${ratio < 0 ? 'compress-badge--warn' : ''}`}>
              {ratioLabel}
            </div>
          </div>
          <p className="result-box__filename">{result.name}</p>
          <Button
            variant="secondary-dark"
            onClick={() => { const a = document.createElement('a'); a.href = result.url; a.download = result.name; a.click() }}
          >
            下载文件
          </Button>
        </div>
      )}
    </ToolPage>
  )
}
