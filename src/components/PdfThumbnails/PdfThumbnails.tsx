import { useEffect, useRef, useState } from 'react'
import { pdfjs } from '../../lib/pdfjs'
import './PdfThumbnails.css'

interface PdfThumbnailsProps {
  file: File
  /** Highlight these page indices (0-based) */
  highlighted?: Set<number>
  /** Called when user clicks a page — toggles selection if onSelect provided */
  onSelect?: (index: number) => void
  maxPages?: number
}

function ThumbnailCanvas({ doc, pageIndex, highlighted, onSelect }: {
  doc: pdfjs.PDFDocumentProxy
  pageIndex: number
  highlighted: boolean
  onSelect?: (index: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let renderTask: { promise: Promise<void>; cancel: () => void } | null = null
    let cancelled = false
    doc.getPage(pageIndex + 1).then(page => {
      if (cancelled || !canvasRef.current) return
      const vp = page.getViewport({ scale: 0.3 })
      const canvas = canvasRef.current
      canvas.width = vp.width
      canvas.height = vp.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      renderTask = page.render({ canvas, canvasContext: ctx, viewport: vp })
      renderTask.promise.catch(() => {/* cancelled — ignore */})
    })
    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [doc, pageIndex])

  return (
    <div
      className={`pdf-thumb ${highlighted ? 'pdf-thumb--selected' : ''} ${onSelect ? 'pdf-thumb--clickable' : ''}`}
      onClick={() => onSelect?.(pageIndex)}
    >
      <canvas ref={canvasRef} className="pdf-thumb__canvas" />
      <span className="pdf-thumb__num">{pageIndex + 1}</span>
      {highlighted && (
        <span className="pdf-thumb__check">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
    </div>
  )
}

export function PdfThumbnails({ file, highlighted, onSelect, maxPages = 20 }: PdfThumbnailsProps) {
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setDoc(null)
    file.arrayBuffer().then(buf => {
      if (cancelled) return
      return pdfjs.getDocument({ data: buf }).promise
    }).then(d => {
      if (cancelled || !d) return
      setDoc(d)
      setPageCount(d.numPages)
      setLoading(false)
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [file])

  if (loading) return (
    <div className="pdf-thumbs-loading">
      <span className="pdf-thumbs-loading__dot" />
      加载预览中...
    </div>
  )
  if (!doc) return null

  const visible = Math.min(pageCount, maxPages)

  return (
    <div className="pdf-thumbs">
      <p className="pdf-thumbs__label">
        页面预览 · 共 {pageCount} 页
        {pageCount > maxPages && <span className="pdf-thumbs__more">（显示前 {maxPages} 页）</span>}
      </p>
      <div className="pdf-thumbs__grid">
        {Array.from({ length: visible }, (_, i) => (
          <ThumbnailCanvas
            key={i}
            doc={doc}
            pageIndex={i}
            highlighted={highlighted?.has(i) ?? false}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}
