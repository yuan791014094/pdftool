import { useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import { ToolPage } from '../components/ToolPage'
import { DropZone } from '../components/DropZone'
import { Button } from '../components/Button'
import { ProgressBar } from '../components/ProgressBar'
import '../components/ToolPage/ToolPage.css'
import './PdfToImagePage.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

type Format = 'png' | 'jpeg'

export function PdfToImagePage() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [format, setFormat] = useState<Format>('png')
  const [scale, setScale] = useState(2)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [images, setImages] = useState<{ url: string; name: string }[]>([])

  const onFile = async (files: File[]) => {
    const f = files[0]; if (!f) return
    setError(''); setImages([])
    try {
      const buf = await f.arrayBuffer()
      const doc = await pdfjs.getDocument({ data: buf }).promise
      setPageCount(doc.numPages); setFile(f)
    } catch { setError('无法读取 PDF 文件') }
  }

  const convert = async () => {
    if (!file) return
    setBusy(true); setError(''); setImages([]); setProgress(0)
    try {
      const buf = await file.arrayBuffer()
      const doc = await pdfjs.getDocument({ data: buf }).promise
      const results: { url: string; name: string }[] = []
      const baseName = file.name.replace(/\.pdf$/i, '')
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const vp = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = vp.width; canvas.height = vp.height
        const ctx = canvas.getContext('2d')!
        await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
        const url = canvas.toDataURL(mimeType, 0.92)
        results.push({ url, name: `${baseName}_p${i}.${format}` })
        setProgress(Math.round((i / doc.numPages) * 100))
      }
      setImages(results)
    } catch (e: unknown) {
      setError(`转换失败：${e instanceof Error ? e.message : String(e)}`)
    } finally { setBusy(false) }
  }

  const downloadAll = () => {
    images.forEach(img => {
      const a = document.createElement('a'); a.href = img.url; a.download = img.name; a.click()
    })
  }

  return (
    <ToolPage title="PDF 转图片" desc="将 PDF 每页渲染为 PNG 或 JPG 图片。">
      <div className="tool-card-inner">
        <DropZone onFiles={onFile} accept=".pdf" sublabel="选择一个 PDF 文件" />
        {file && (
          <div className="pdf2img-options">
            <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-muted)' }}>
              {file.name}（共 {pageCount} 页）
            </p>
            <div className="pdf2img-row">
              <div className="pdf2img-field">
                <p className="pdf2img-label">输出格式</p>
                <div className="rotate-angle-group">
                  {(['png', 'jpeg'] as Format[]).map(f => (
                    <button
                      key={f}
                      className={`rotate-angle-btn ${format === f ? 'rotate-angle-btn--active' : ''}`}
                      onClick={() => setFormat(f)}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pdf2img-field">
                <p className="pdf2img-label">分辨率倍率</p>
                <div className="rotate-angle-group">
                  {[1, 1.5, 2, 3].map(s => (
                    <button
                      key={s}
                      className={`rotate-angle-btn ${scale === s ? 'rotate-angle-btn--active' : ''}`}
                      onClick={() => setScale(s)}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {error && <div className="status-msg status-msg--error">{error}</div>}
        {busy && <ProgressBar value={progress} label="渲染中..." />}
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Button onClick={convert} disabled={!file || busy} loading={busy}>开始转换</Button>
        </div>
      </div>
      {images.length > 0 && (
        <div className="result-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <p className="result-box__label">转换完成，共 {images.length} 张</p>
            <Button variant="secondary-dark" size="sm" onClick={downloadAll}>全部下载</Button>
          </div>
          <div className="pdf2img-previews">
            {images.map(img => (
              <div key={img.name} className="pdf2img-thumb">
                <img src={img.url} alt={img.name} />
                <div className="pdf2img-thumb__overlay">
                  <a href={img.url} download={img.name} className="pdf2img-thumb__dl">下载</a>
                </div>
                <p className="pdf2img-thumb__name">{img.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </ToolPage>
  )
}
